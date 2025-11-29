#!/bin/bash

# Deployment script for manga reader serverless backend

set -e

# Configuration
ENVIRONMENT_NAME="manga-reader"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=""

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

create_s3_bucket() {
    local bucket_name="$1"

    if aws s3 ls "s3://$bucket_name" &> /dev/null; then
        print_warning "S3 bucket $bucket_name already exists"
    else
        print_step "Creating S3 bucket: $bucket_name"

        if [ "$AWS_REGION" = "us-east-1" ]; then
            aws s3 mb "s3://$bucket_name"
        else
            aws s3 mb "s3://$bucket_name" --region "$AWS_REGION"
        fi
        print_success "S3 bucket created: $bucket_name"
    fi
}

build_and_upload_layer() {
    print_step "Building PostgreSQL Lambda layer"

    # Create layer bucket
    local layer_bucket="${ENVIRONMENT_NAME}-lambda-layers-${AWS_ACCOUNT_ID}"
    create_s3_bucket "$layer_bucket"

    # Build layer
    ./scripts/build-layer.sh

    # Upload layer
    print_step "Uploading Lambda layer to S3"
    aws s3 cp postgresql-layer.zip "s3://$layer_bucket/"
    print_success "Lambda layer uploaded"
}

deploy_stack() {
    local stack_name="$1"
    local template_file="$2"
    local capabilities="$3"

    print_step "Deploying CloudFormation stack: $stack_name"

    local params="ParameterKey=EnvironmentName,ParameterValue=$ENVIRONMENT_NAME"

    if aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        print_step "Updating existing stack: $stack_name"
        aws cloudformation update-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters "$params" \
            ${capabilities:+--capabilities "$capabilities"}
    else
        print_step "Creating new stack: $stack_name"
        aws cloudformation create-stack \
            --stack-name "$stack_name" \
            --template-body "file://$template_file" \
            --parameters "$params" \
            ${capabilities:+--capabilities "$capabilities"}
    fi

    print_step "Waiting for stack operation to complete..."
    aws cloudformation wait stack-create-complete --stack-name "$stack_name" 2>/dev/null || \
    aws cloudformation wait stack-update-complete --stack-name "$stack_name" 2>/dev/null || \
    true

    # Check stack status
    local status=$(aws cloudformation describe-stacks --stack-name "$stack_name" --query 'Stacks[0].StackStatus' --output text)
    if [[ "$status" == *"COMPLETE" ]]; then
        print_success "Stack deployment completed: $stack_name ($status)"
    else
        print_error "Stack deployment failed: $stack_name ($status)"
        exit 1
    fi
}

package_and_deploy_lambda() {
    print_step "Packaging Lambda function"

    # Create deployment package
    cd lambda
    zip -r ../lambda-deployment.zip . -x "*.pyc" "*__pycache__*"
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
}

run_database_migration() {
    print_step "Running database migration"

    local secret_arn=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-database" \
        --query "Stacks[0].Outputs[?OutputKey=='DatabaseConnectionSecretArn'].OutputValue" \
        --output text)

    if [ -z "$secret_arn" ]; then
        print_error "Could not find database secret ARN"
        exit 1
    fi

    python3 scripts/migrate-database.py --secret-arn "$secret_arn" --region "$AWS_REGION"
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

    # Get outputs from all stacks
    local api_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
        --output text 2>/dev/null || echo "Not available")

    local db_endpoint=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-database" \
        --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpoint'].OutputValue" \
        --output text 2>/dev/null || echo "Not available")

    local s3_bucket=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
        --output text 2>/dev/null || echo "Not available")

    echo "  • API Endpoint: $api_endpoint"
    echo "  • Database Endpoint: $db_endpoint"
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
    print_step "Starting manga reader backend deployment"

    # Pre-flight checks
    check_aws_cli
    check_aws_credentials

    # Build and upload Lambda layer
    build_and_upload_layer

    # Deploy infrastructure stacks
    deploy_stack "${ENVIRONMENT_NAME}-network" "infrastructure/01-network.yaml"
    deploy_stack "${ENVIRONMENT_NAME}-database" "infrastructure/02-database.yaml"
    deploy_stack "${ENVIRONMENT_NAME}-serverless" "infrastructure/03-serverless.yaml" "CAPABILITY_NAMED_IAM"

    # Deploy Lambda code
    package_and_deploy_lambda

    # Run database migration
    run_database_migration

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
        --help)
            echo "Usage: $0 [--region AWS_REGION] [--environment ENV_NAME]"
            echo "  --region:      AWS region (default: us-east-1)"
            echo "  --environment: Environment name (default: manga-reader)"
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