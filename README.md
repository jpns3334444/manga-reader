# Manga Reader Serverless Backend

A complete serverless backend for a manga reader application built on AWS using CloudFormation, Lambda, API Gateway, RDS PostgreSQL, and S3.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│     Lambda      │───▶│   RDS (PostgreSQL)
│                 │    │                 │    │   Private Subnet
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │       S3        │
                      │  (Manga Images) │
                      └─────────────────┘
```

## Features

### API Endpoints
- **GET /manga** - List all manga series
- **GET /manga/{id}** - Get specific manga details
- **GET /manga/{id}/chapters** - List chapters for a manga
- **GET /chapters/{id}** - Get chapter details with signed image URLs
- **POST /manga** - Create new manga series (admin)
- **POST /chapters** - Create new chapter with pages (admin)

### Infrastructure
- **VPC** with public/private subnets across 2 AZs
- **RDS PostgreSQL** database in private subnets
- **Lambda functions** with VPC connectivity
- **API Gateway HTTP API** for REST endpoints
- **S3 bucket** for manga page images with presigned URLs
- **Secrets Manager** for database credentials
- **CloudWatch** logging and monitoring

## Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Python 3.11+
- jq (for JSON parsing in scripts)

### Deployment

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd manga-reader
   ```

2. **Deploy infrastructure**:
   ```bash
   ./deploy.sh
   ```

   This will:
   - Create all CloudFormation stacks
   - Build and deploy the Lambda layer
   - Deploy the Lambda function code
   - Run database migrations
   - Test the deployment

3. **Test the API**:
   ```bash
   ./test-api.sh
   ```

### Manual Deployment

If you prefer to deploy manually:

1. **Build Lambda layer**:
   ```bash
   ./scripts/build-layer.sh
   # Upload postgresql-layer.zip to S3
   ```

2. **Deploy CloudFormation stacks**:
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/01-network.yaml \
     --stack-name manga-reader-network \
     --parameter-overrides EnvironmentName=manga-reader

   aws cloudformation deploy \
     --template-file infrastructure/02-database.yaml \
     --stack-name manga-reader-database \
     --parameter-overrides EnvironmentName=manga-reader

   aws cloudformation deploy \
     --template-file infrastructure/03-serverless.yaml \
     --stack-name manga-reader-serverless \
     --parameter-overrides EnvironmentName=manga-reader \
     --capabilities CAPABILITY_NAMED_IAM
   ```

3. **Run database migration**:
   ```bash
   python3 scripts/migrate-database.py \
     --secret-arn arn:aws:secretsmanager:region:account:secret:manga-reader/database/connection-xxxxx
   ```

## Database Schema

The database uses PostgreSQL with the following tables:

### manga
- `id` (UUID, Primary Key)
- `title` (VARCHAR 255)
- `slug` (VARCHAR 255, Unique)
- `description` (TEXT)
- `cover_image_url` (VARCHAR 500)
- `status` (VARCHAR 20) - 'ongoing', 'completed', 'hiatus', 'cancelled'
- `created_at`, `updated_at` (TIMESTAMP)

### chapters
- `id` (UUID, Primary Key)
- `manga_id` (UUID, Foreign Key)
- `chapter_number` (DECIMAL 10,2)
- `title` (VARCHAR 255)
- `page_count` (INTEGER)
- `created_at` (TIMESTAMP)

### chapter_pages
- `id` (UUID, Primary Key)
- `chapter_id` (UUID, Foreign Key)
- `page_number` (INTEGER)
- `image_key` (VARCHAR 500) - S3 object key
- `created_at` (TIMESTAMP)

## API Usage

### Create a manga series
```bash
curl -X POST https://your-api-endpoint/manga \
  -H "Content-Type: application/json" \
  -d '{
    "title": "One Piece",
    "slug": "one-piece",
    "description": "The adventures of Monkey D. Luffy",
    "status": "ongoing"
  }'
```

### Create a chapter with pages
```bash
curl -X POST https://your-api-endpoint/chapters \
  -H "Content-Type: application/json" \
  -d '{
    "manga_id": "uuid-here",
    "chapter_number": 1,
    "title": "Romance Dawn",
    "page_count": 20,
    "pages": [
      {"page_number": 1, "image_key": "one-piece/chapter-1/page-001.jpg"},
      {"page_number": 2, "image_key": "one-piece/chapter-1/page-002.jpg"}
    ]
  }'
```

### Get manga list
```bash
curl https://your-api-endpoint/manga
```

### Get chapter with signed image URLs
```bash
curl https://your-api-endpoint/chapters/uuid-here
```

## File Structure

```
manga-reader/
├── infrastructure/
│   ├── 01-network.yaml          # VPC, subnets, gateways
│   ├── 02-database.yaml         # RDS, security groups, secrets
│   └── 03-serverless.yaml       # Lambda, API Gateway, S3
├── lambda/
│   ├── lambda_function.py       # Main Lambda function code
│   └── requirements.txt         # Python dependencies
├── database/
│   └── schema.sql              # Database schema with sample data
├── scripts/
│   ├── build-layer.sh          # Build PostgreSQL Lambda layer
│   └── migrate-database.py     # Database migration script
├── deploy.sh                   # Main deployment script
├── test-api.sh                 # API testing script
└── README.md
```

## Configuration

### Environment Variables (Lambda)
- `DB_SECRET_ARN` - ARN of database connection secret
- `S3_BUCKET` - Name of S3 bucket for images
- `ENVIRONMENT` - Environment name

### CloudFormation Parameters
- `EnvironmentName` - Prefix for all resources (default: manga-reader)
- `VpcCidr` - VPC CIDR block (default: 10.0.0.0/16)
- `DBInstanceClass` - RDS instance type (default: db.t3.micro)
- `DBAllocatedStorage` - Database storage size (default: 20GB)

## Security Features

- **VPC isolation** - Database in private subnets
- **Secrets Manager** - Database credentials rotation
- **S3 bucket encryption** - AES-256 encryption at rest
- **Presigned URLs** - Time-limited access to images
- **Security groups** - Restricted network access
- **IAM roles** - Least privilege access

## Monitoring

- **CloudWatch Logs** - Lambda and API Gateway logs
- **RDS Performance Insights** - Database monitoring
- **CloudWatch Metrics** - API and Lambda metrics

## Cost Optimization

- **RDS**: Uses db.t3.micro for development (upgrade for production)
- **Lambda**: 256MB memory, 30-second timeout
- **S3**: Standard storage class (consider Intelligent Tiering)
- **CloudWatch**: 14-day log retention

## Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase timeout in CloudFormation template
2. **Database connection**: Check security groups and VPC configuration
3. **S3 access**: Verify IAM permissions for Lambda role
4. **Migration fails**: Check database credentials and network connectivity

### Useful Commands

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name manga-reader-network

# View Lambda logs
aws logs tail /aws/lambda/manga-reader-manga-api --follow

# Test database connection
python3 scripts/migrate-database.py --secret-arn <arn> --force

# Update Lambda code only
cd lambda && zip -r ../update.zip . && \
aws lambda update-function-code --function-name manga-reader-manga-api --zip-file fileb://../update.zip
```

## Development

### Local Testing

1. **Set up environment**:
   ```bash
   export DB_SECRET_ARN="your-secret-arn"
   export S3_BUCKET="your-bucket-name"
   export ENVIRONMENT="manga-reader"
   ```

2. **Install dependencies**:
   ```bash
   cd lambda
   pip install -r requirements.txt
   ```

3. **Run tests**:
   ```bash
   python3 -c "import lambda_function; print('Import successful')"
   ```

### Adding New Endpoints

1. Add route in `infrastructure/03-serverless.yaml`
2. Implement handler in `lambda/lambda_function.py`
3. Test with `test-api.sh`
4. Deploy with `deploy.sh`

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review CloudWatch logs
3. Verify AWS service limits
4. Create an issue in the repository