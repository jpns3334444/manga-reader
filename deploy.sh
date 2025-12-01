#!/bin/bash

# Deployment script for manga reader serverless backend with Neon PostgreSQL

set -e

ENVIRONMENT_NAME="manga-reader"
DATABASE_URL=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}===> $1${NC}"; }
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }

check_prerequisites() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    print_success "AWS CLI configured"
}

prompt_database_url() {
    if [ -n "$DATABASE_URL" ]; then return; fi

    print_warning "DATABASE_URL not provided"
    echo "Format: postgresql://user:password@host/dbname?sslmode=require"
    read -p "Enter DATABASE_URL: " DATABASE_URL

    if [ -z "$DATABASE_URL" ] || [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
        print_error "Invalid DATABASE_URL"
        exit 1
    fi
}

deploy_stack() {
    local stack_name="$1"
    local template_file="$2"

    print_step "Deploying stack: $stack_name"

    local params="ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT_NAME ParameterKey=DatabaseURL,ParameterValue=$DATABASE_URL"
    local status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

    # Clean up failed stacks
    if [[ "$status" == "ROLLBACK_COMPLETE" ]] || [[ "$status" == "CREATE_FAILED" ]]; then
        print_warning "Deleting failed stack..."
        aws cloudformation delete-stack --stack-name "$stack_name"
        aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
        status="DOES_NOT_EXIST"
    fi

    if [[ "$status" != "DOES_NOT_EXIST" ]]; then
        if ! aws cloudformation update-stack --stack-name "$stack_name" --template-body "file://$template_file" \
            --parameters $params --capabilities CAPABILITY_NAMED_IAM 2>/tmp/cfn-error.txt; then
            if grep -q "No updates are to be performed" /tmp/cfn-error.txt; then
                print_warning "No updates needed"
                return 0
            fi
            print_error "Update failed"; cat /tmp/cfn-error.txt; return 1
        fi
        aws cloudformation wait stack-update-complete --stack-name "$stack_name"
    else
        aws cloudformation create-stack --stack-name "$stack_name" --template-body "file://$template_file" \
            --parameters $params --capabilities CAPABILITY_NAMED_IAM
        aws cloudformation wait stack-create-complete --stack-name "$stack_name"
    fi
    print_success "Stack deployed"
}

package_and_deploy_lambda() {
    print_step "Packaging Lambda function"
    cd lambda

    if [ -s requirements.txt ]; then
        pip install -r requirements.txt -t . --platform manylinux2014_x86_64 --only-binary=:all: --upgrade 2>/dev/null || true
    fi

    zip -rq ../lambda-deployment.zip . -x "*.pyc" "*__pycache__*" "*.dist-info/*"
    cd ..

    aws lambda update-function-code --function-name "${ENVIRONMENT_NAME}-manga-api" --zip-file "fileb://lambda-deployment.zip" >/dev/null
    rm lambda-deployment.zip

    # Cleanup installed packages
    cd lambda && rm -rf psycopg2* *.dist-info *.egg-info __pycache__ 2>/dev/null || true && cd ..
    print_success "Lambda deployed"
}

run_migration() {
    read -p "Run database migration? (y/n): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        print_step "Running migration"
        python3 scripts/migrate-database.py --database-url "$DATABASE_URL"
        print_success "Migration completed"
    fi
}

test_api() {
    print_step "Testing API"
    local endpoint=$(aws cloudformation describe-stacks --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text)
    curl -s "$endpoint/manga" | jq . || print_warning "API test failed"
    print_success "API endpoint: $endpoint"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment) ENVIRONMENT_NAME="$2"; shift 2 ;;
        --database-url) DATABASE_URL="$2"; shift 2 ;;
        --help) echo "Usage: $0 [--environment NAME] [--database-url URL]"; exit 0 ;;
        *) print_error "Unknown option: $1"; exit 1 ;;
    esac
done

# Main
check_prerequisites
prompt_database_url
deploy_stack "${ENVIRONMENT_NAME}-serverless" "infrastructure/03-serverless.yaml"
package_and_deploy_lambda
run_migration
test_api
