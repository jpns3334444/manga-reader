#!/bin/bash

# Test script for manga reader API

set -e

ENVIRONMENT_NAME="manga-reader"
API_ENDPOINT=""
TEST_MANGA_ID=""
TEST_CHAPTER_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

get_api_endpoint() {
    API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "${ENVIRONMENT_NAME}-serverless" \
        --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
        --output text 2>/dev/null)

    if [ -z "$API_ENDPOINT" ]; then
        print_error "Could not find API endpoint. Make sure the stack is deployed."
        exit 1
    fi

    echo "API Endpoint: $API_ENDPOINT"
}

test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local expected_status="$4"

    print_test "$method $endpoint"

    if [ -n "$data" ]; then
        response=$(curl -s -w "%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_ENDPOINT$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" "$API_ENDPOINT$endpoint")
    fi

    local status_code="${response: -3}"
    local body="${response%???}"

    if [ "$status_code" = "$expected_status" ]; then
        print_success "Status: $status_code"
        echo "Response: $body" | jq . 2>/dev/null || echo "Response: $body"
    else
        print_error "Expected status $expected_status, got $status_code"
        echo "Response: $body"
        return 1
    fi

    echo ""
}

create_sample_manga() {
    print_test "Creating sample manga"

    # Create One Piece manga
    local manga_data='{
        "title": "One Piece Test",
        "slug": "one-piece-test",
        "description": "Test manga for API testing",
        "status": "ongoing"
    }'

    response=$(curl -s -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$manga_data" \
        "$API_ENDPOINT/manga")

    local status_code="${response: -3}"
    local body="${response%???}"

    if [ "$status_code" = "201" ]; then
        print_success "Manga created successfully"
        local manga_id=$(echo "$body" | jq -r '.manga.id')
        TEST_MANGA_ID="$manga_id"
        echo "Manga ID: $manga_id"

        # Create a sample chapter
        local chapter_data='{
            "manga_id": "'$manga_id'",
            "chapter_number": 1,
            "title": "Test Chapter 1",
            "page_count": 20,
            "pages": [
                {"page_number": 1, "image_key": "one-piece-test/chapter-1/page-001.jpg"},
                {"page_number": 2, "image_key": "one-piece-test/chapter-1/page-002.jpg"}
            ]
        }'

        print_test "Creating sample chapter"
        response=$(curl -s -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$chapter_data" \
            "$API_ENDPOINT/chapters")

        status_code="${response: -3}"
        body="${response%???}"

        if [ "$status_code" = "201" ]; then
            print_success "Chapter created successfully"
            local chapter_id=$(echo "$body" | jq -r '.chapter.id')
            TEST_CHAPTER_ID="$chapter_id"
            echo "Chapter ID: $chapter_id"
            echo "$manga_id:$chapter_id"
        else
            print_error "Chapter creation failed"
            echo "Response: $body"
            echo "$manga_id:"
        fi
    else
        print_error "Manga creation failed"
        echo "Response: $body"
        echo ":"
    fi
}

run_tests() {
    echo "🧪 Running API Tests"
    echo "==================="

    # Test basic endpoints
    test_endpoint "GET" "/manga" "" "200"

    # Create sample data and get IDs
    ids=$(create_sample_manga)
    manga_id=$(echo "$ids" | cut -d: -f1)
    chapter_id=$(echo "$ids" | cut -d: -f2)

    if [ -n "$manga_id" ]; then
        test_endpoint "GET" "/manga/$manga_id" "" "200"
        test_endpoint "GET" "/manga/$manga_id/chapters" "" "200"

        if [ -n "$chapter_id" ]; then
            test_endpoint "GET" "/chapters/$chapter_id" "" "200"
        fi
    fi

    # Test error cases
    print_test "Testing error cases"
    test_endpoint "GET" "/manga/nonexistent" "" "404"
    test_endpoint "GET" "/chapters/nonexistent" "" "404"

    # Test invalid POST data
    test_endpoint "POST" "/manga" '{"invalid": "data"}' "400"

    echo "🏁 API Tests Completed"
}

cleanup_test_data() {
    if [ -z "$TEST_MANGA_ID" ]; then return; fi

    echo ""
    print_test "Cleaning up test data"

    if [ -z "$DATABASE_URL" ]; then
        read -p "Enter DATABASE_URL for cleanup (or press Enter to skip): " DATABASE_URL
        if [ -z "$DATABASE_URL" ]; then
            print_error "Skipping cleanup - no DATABASE_URL"
            return
        fi
    fi

    psql "$DATABASE_URL" -c "DELETE FROM chapter_pages WHERE chapter_id IN (SELECT id FROM chapters WHERE manga_id = '$TEST_MANGA_ID');" 2>/dev/null || true
    psql "$DATABASE_URL" -c "DELETE FROM chapters WHERE manga_id = '$TEST_MANGA_ID';" 2>/dev/null || true
    psql "$DATABASE_URL" -c "DELETE FROM manga WHERE id = '$TEST_MANGA_ID';" 2>/dev/null || true

    print_success "Test data cleaned up"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT_NAME="$2"
            shift 2
            ;;
        --endpoint)
            API_ENDPOINT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--environment ENV_NAME] [--endpoint API_URL]"
            echo "  --environment: Environment name (default: manga-reader)"
            echo "  --endpoint:    API endpoint URL (auto-detected if not provided)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Main execution
if [ -z "$API_ENDPOINT" ]; then
    get_api_endpoint
fi

run_tests
cleanup_test_data