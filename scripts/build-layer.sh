#!/bin/bash

# Build PostgreSQL Lambda Layer for Python

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LAYER_DIR="$PROJECT_DIR/layer"
LAMBDA_DIR="$PROJECT_DIR/lambda"

echo "Building PostgreSQL Lambda Layer..."

# Clean and create layer directory
rm -rf "$LAYER_DIR"
mkdir -p "$LAYER_DIR/python"

# Install dependencies
echo "Installing Python dependencies..."
cd "$LAMBDA_DIR"
pip install -r requirements.txt -t "$LAYER_DIR/python/" --platform linux_x86_64 --only-binary=all

# Create ZIP file
echo "Creating layer ZIP file..."
cd "$LAYER_DIR"
zip -r "$PROJECT_DIR/postgresql-layer.zip" python/

echo "Layer built successfully: $PROJECT_DIR/postgresql-layer.zip"
echo "Upload this file to S3 bucket: manga-reader-lambda-layers-{your-account-id}"