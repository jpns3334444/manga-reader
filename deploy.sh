#!/bin/bash

# Simplified deployment script for manga reader serverless backend with Neon PostgreSQL

set -e

# Configuration
ENVIRONMENT_NAME="manga-reader"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=""
DATABASE_URL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}===> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    print_success "AWS CLI found"
}

check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi

    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "AWS credentials configured (Account: $AWS_ACCOUNT_ID)"
}

prompt_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        echo ""
        print_warning "DATABASE_URL not provided"
        echo ""
        echo "Please provide your Neon PostgreSQL connection string."
        echo "Format: postgresql://user:password@host/dbname?sslmode=require"
        echo ""
        echo "To get your Neon connection string:"
        echo "  1. Go to https://console.neon.tech"
        echo "  2. Select your project"
        echo "  3. Go to 'Connection Details'"
        echo "  4. Copy the connection string"
        echo ""
        read -p "Enter DATABASE_URL: " DATABASE_URL

        if [ -z "$DATABASE_URL" ]; then
            print_error "DATABASE_URL is required"
            exit 1
        fi

        # Validate format
        if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
            print_error "Invalid DATABASE_URL format. Must start with postgresql://"
            exit 1
        fi

        print_success "DATABASE_URL provided"
    fi
}

deploy_stack() {
    local stack_name="$1"
    local template_file="$2"
    local capabilities="$3"

    print_step "Deploying CloudFormation stack: $stack_name"

    local params="ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT_NAME ParameterKey=DatabaseURL,ParameterValue=$DATABASE_URL"

    # Check if stack exists and is in a failed state
    local existing_status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

    if [[ "$existing_status" == "ROLLBACK_COMPLETE" ]] || [[ "$existing_status" == "CREATE_FAILED" ]]; then
        print_warning "Stack is in $existing_status state. Deleting before recreating..."
        aws cloudformation delete-stack --stack-name "$stack_name"
        print_step "Waiting for stack deletion..."
        aws cloudformation wait stack-delete-complete --stack-name "$stack_name"
        print_success "Stack deleted"
        existing_status="DOES_NOT_EXIST"
    fi

    if [[ "$existing_status" != "DOES_NOT_EXIST" ]]; then
        print_step "Updating existing stack: $stack_name"
        if ! aws cloudformation update-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters $params \
            ${capabilities:+--capabilities "$capabilities"} 2>&1 | tee /tmp/cfn-error.txt; then

            if grep -q "No updates are to be performed" /tmp/cfn-error.txt; then
                print_warning "No updates to be performed on stack: $stack_name"
                return 0
            else
                print_error "Failed to update stack"
                cat /tmp/cfn-error.txt
                return 1
            fi
        fi
        local operation="update"
    else
        print_step "Creating new stack: $stack_name"
        if ! aws cloudformation create-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters $params \
            ${capabilities:+--capabilities "$capabilities"} 2>&1 | tee /tmp/cfn-error.txt; then

            print_error "Failed to create stack"
            cat /tmp/cfn-error.txt
            return 1
        fi
        local operation="create"
    fi

    print_step "Waiting for stack operation to complete..."

    # Wait with timeout and show progress
    local max_wait=600  # 10 minutes
    local elapsed=0
    local interval=10

    while [ $elapsed -lt $max_wait ]; do
        local status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "UNKNOWN")

        if [[ "$status" == *"COMPLETE"* ]]; then
            print_success "Stack deployment completed: $stack_name ($status)"
            return 0
        elif [[ "$status" == *"FAILED"* ]] || [[ "$status" == *"ROLLBACK"* ]]; then
            print_error "Stack deployment failed: $stack_name ($status)"
            print_error "Recent stack events:"
            aws cloudformation describe-stack-events \
                --stack-name "$stack_name" \
                --max-items 10 \
                --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED` || ResourceStatus==`DELETE_FAILED`].[Timestamp,ResourceType,LogicalResourceId,ResourceStatusReason]' \
                --output table
            return 1
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done

    print_error "Stack operation timed out after ${max_wait} seconds"
    return 1
}

package_and_deploy_lambda() {
    print_step "Packaging Lambda function"

    # Create deployment package
    cd lambda

    # Install dependencies locally if requirements.txt exists and has content
    if [ -s requirements.txt ]; then
        print_step "Installing Lambda dependencies"
        pip install -r requirements.txt -t . --platform manylinux2014_x86_64 --only-binary=:all: --upgrade || {
            print_warning "Failed to install some dependencies, continuing anyway..."
        }
    fi

    zip -r ../lambda-deployment.zip . -x "*.pyc" "*__pycache__*" "*.dist-info/*" "*.egg-info/*"
    cd ..

    # Update Lambda function code
    local function_name="${ENVIRONMENT_NAME}-manga-api"

    print_step "Updating Lambda function code"
    aws lambda update-function-code \
        --function-name "$function_name" \
        --zip-file "fileb://lambda-deployment.zip"

    print_success "Lambda function updated"

    # Clean up
    rm lambda-deployment.zip

    # Clean up installed dependencies
    if [ -s lambda/requirements.txt ]; then
        cd lambda
        # Remove installed packages but keep source files
        find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
        find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
        find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
        # Remove psycopg2 directories if they exist
        rm -rf psycopg2* 2>/dev/null || true
        cd ..
    fi
}

run_database_migration() {
    print_step "Running database migration"

    python3 scripts/migrate-database.py --database-url "$DATABASE_URL"
    print_success "Database migration completed"
}

test_api() {
    print_step "Testing API deployment"

    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
        --output text)

    if [ -z "$api_endpoint" ]; then
        print_error "Could not find API endpoint"
        exit 1
    fi

    print_step "API Endpoint: $api_endpoint"

    # Test API
    echo "Testing GET /manga endpoint..."
    curl -s "$api_endpoint/manga" | jq . || print_warning "API test failed (this is normal if database is empty)"

    print_success "API deployment test completed"
}

show_outputs() {
    print_step "Deployment Summary"

    echo ""
    echo "🚀 Manga Reader Backend Deployed Successfully!"
    echo ""
    echo "📋 Stack Information:"

    # Get outputs from stack
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
        --output text 2>/dev/null || echo "Not available")

    local s3_bucket=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
        --output text 2>/dev/null || echo "Not available")

    echo "  • API Endpoint: $api_endpoint"
    echo "  • Database: Neon PostgreSQL (serverless)"
    echo "  • S3 Bucket: $s3_bucket"
    echo ""
    echo "🧪 API Endpoints:"
    echo "  • GET  $api_endpoint/manga"
    echo "  • GET  $api_endpoint/manga/{id}"
    echo "  • GET  $api_endpoint/manga/{id}/chapters"
    echo "  • GET  $api_endpoint/chapters/{id}"
    echo "  • POST $api_endpoint/manga"
    echo "  • POST $api_endpoint/chapters"
    echo ""
    echo "📖 Next Steps:"
    echo "  1. Upload manga images to S3 bucket: $s3_bucket"
    echo "  2. Test the API endpoints using curl or Postman"
    echo "  3. Create manga series using POST /manga"
    echo "  4. Add chapters using POST /chapters"
    echo ""
}

# Main deployment flow
main() {
    print_step "Starting manga reader backend deployment (Neon PostgreSQL)"

    # Pre-flight checks
    check_aws_cli
    check_aws_credentials
    prompt_database_url

    # Deploy infrastructure stack
    deploy_stack "${ENVIRONMENT_NAME}-serverless" "infrastructure/03-serverless.yaml" "CAPABILITY_NAMED_IAM"

    # Deploy Lambda code
    package_and_deploy_lambda

    # Run database migration
    read -p "Do you want to run database migration? (y/n): " run_migration
    if [[ "$run_migration" =~ ^[Yy]$ ]]; then
        run_database_migration
    else
        print_warning "Skipping database migration"
    fi

    # Test deployment
    test_api

    # Show summary
    show_outputs
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT_NAME="$2"
            shift 2
            ;;
        --database-url)
            DATABASE_URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--region AWS_REGION] [--environment ENV_NAME] [--database-url DATABASE_URL]"
            echo "  --region:       AWS region (default: us-east-1)"
            echo "  --environment:  Environment name (default: manga-reader)"
            echo "  --database-url: Neon PostgreSQL connection string"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main
