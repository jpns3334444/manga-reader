# Manga Reader Serverless Backend

A simplified serverless backend for a manga reader application built on AWS using CloudFormation, Lambda, API Gateway, Neon PostgreSQL (serverless), and S3.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │───▶│     Lambda      │───▶│  Neon PostgreSQL│
│   (HTTP API)    │    │  (No VPC!)      │    │   (Serverless)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │       S3        │
                      │  (Manga Images) │
                      └─────────────────┘
```

### Key Benefits

- **No VPC complexity** - Lambda runs without VPC, Neon is accessible over the internet with SSL
- **No NAT gateways** - Saves ~$32/month per AZ
- **Serverless database** - Neon scales to zero when not in use
- **Simpler deployment** - Single CloudFormation stack instead of three
- **Lower costs** - Pay only for what you use on both compute and database
- **Faster cold starts** - Lambda starts faster without VPC

## Features

### API Endpoints
- **GET /manga** - List all manga series
- **GET /manga/{id}** - Get specific manga details
- **GET /manga/{id}/chapters** - List chapters for a manga
- **GET /chapters/{id}** - Get chapter details with signed image URLs
- **POST /manga** - Create new manga series (admin)
- **POST /chapters** - Create new chapter with pages (admin)

### Infrastructure
- **Lambda functions** - No VPC, direct internet access
- **API Gateway HTTP API** - REST endpoints with CORS
- **S3 bucket** - Manga page images with presigned URLs
- **Neon PostgreSQL** - Serverless PostgreSQL database
- **CloudWatch** - Logging and monitoring

## Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Python 3.11+
- jq (for JSON parsing in scripts)
- A Neon account (free tier available at https://neon.tech)

### Setup Neon Database

1. **Create a Neon account** at https://neon.tech
2. **Create a new project** in the Neon console
3. **Get your connection string**:
   - Go to your project dashboard
   - Click "Connection Details"
   - Copy the connection string (it looks like):
     ```
     postgresql://user:password@ep-xyz-123.us-east-2.aws.neon.tech/dbname?sslmode=require
     ```
   - Keep this handy for deployment

### Deployment

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd manga-reader
   ```

2. **Deploy infrastructure**:
   ```bash
   ./deploy.sh --database-url "postgresql://user:password@host/dbname?sslmode=require"
   ```

   Or run interactively (it will prompt for the DATABASE_URL):
   ```bash
   ./deploy.sh
   ```

   This will:
   - Deploy the CloudFormation stack (Lambda, API Gateway, S3)
   - Deploy the Lambda function code with dependencies
   - Optionally run database migrations
   - Test the deployment

3. **Test the API**:
   ```bash
   ./test-api.sh
   ```

### Manual Deployment

If you prefer to deploy manually:

1. **Run database migration** (one time):
   ```bash
   python3 scripts/migrate-database.py \
     --database-url "postgresql://user:password@host/dbname?sslmode=require"
   ```

2. **Deploy CloudFormation stack**:
   ```bash
   aws cloudformation deploy \
     --template-file infrastructure/03-serverless.yaml \
     --stack-name manga-reader-serverless \
     --parameter-overrides \
       EnvironmentName=manga-reader \
       DatabaseURL="postgresql://user:password@host/dbname?sslmode=require" \
     --capabilities CAPABILITY_NAMED_IAM
   ```

3. **Deploy Lambda code**:
   ```bash
   cd lambda
   pip install -r requirements.txt -t . --platform manylinux2014_x86_64 --only-binary=:all:
   zip -r ../lambda-deployment.zip . -x "*.pyc" "*__pycache__*"
   cd ..

   aws lambda update-function-code \
     --function-name manga-reader-manga-api \
     --zip-file fileb://lambda-deployment.zip
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
│   └── 03-serverless.yaml       # Lambda, API Gateway, S3 (simplified!)
├── lambda/
│   ├── lambda_function.py       # Main Lambda function code
│   └── requirements.txt         # Python dependencies (psycopg2-binary only)
├── database/
│   └── schema.sql              # Database schema with sample data
├── scripts/
│   └── migrate-database.py     # Database migration script
├── deploy.sh                   # Simplified deployment script
├── test-api.sh                 # API testing script
└── README.md
```

### What's Gone

Removed complexity compared to traditional VPC-based architecture:
- ❌ infrastructure/01-network.yaml - No more VPC, subnets, NAT gateways
- ❌ infrastructure/02-database.yaml - No more RDS, security groups, Secrets Manager
- ❌ scripts/build-layer.sh - No more Lambda layers needed
- ❌ VPC configuration in Lambda
- ❌ Security groups
- ❌ Secrets Manager
- ❌ NAT gateways (~$32/month savings per AZ)

## Configuration

### Environment Variables (Lambda)
- `DATABASE_URL` - Neon PostgreSQL connection string
- `S3_BUCKET` - Name of S3 bucket for images
- `ENVIRONMENT` - Environment name

### CloudFormation Parameters
- `EnvironmentName` - Prefix for all resources (default: manga-reader)
- `DatabaseURL` - Neon connection string (required, NoEcho for security)
- `LambdaRuntime` - Python runtime version (default: python3.11)

## Security Features

- **SSL/TLS** - All connections to Neon use SSL (required)
- **S3 bucket encryption** - AES-256 encryption at rest
- **Presigned URLs** - Time-limited access to images
- **IAM roles** - Least privilege access for Lambda
- **NoEcho parameter** - Database URL hidden in CloudFormation

## Monitoring

- **CloudWatch Logs** - Lambda and API Gateway logs (14-day retention)
- **Neon Dashboard** - Database metrics and query insights
- **CloudWatch Metrics** - API and Lambda metrics

## Cost Optimization

### Monthly Cost Estimate (Low Traffic)
- **Lambda**: ~$0-5 (free tier covers 1M requests)
- **API Gateway**: ~$0-3 (free tier covers 1M requests for 12 months)
- **S3**: ~$0-2 (depends on storage and requests)
- **Neon**: $0 (free tier: 0.5 GB storage, compute scales to zero)
- **NAT Gateway**: $0 (eliminated!)

**Total**: ~$0-10/month vs ~$65+/month with VPC/NAT/RDS

### Cost Savings
- No NAT gateways: **-$32/month per AZ**
- No RDS instance: **-$15+/month**
- Neon scales to zero: **Pay only when active**
- Simpler architecture: **Faster development = lower maintenance costs**

## Neon Database Benefits

- **Serverless** - Automatically scales to zero when inactive
- **Instant provisioning** - Database ready in seconds
- **Branching** - Create database branches for testing
- **Point-in-time recovery** - Built-in backups
- **Connection pooling** - Built-in pooler for serverless functions
- **PostgreSQL compatible** - Use standard psycopg2 driver
- **Free tier** - 0.5 GB storage, 1 compute hour/month included

## Troubleshooting

### Common Issues

1. **Lambda timeout**: Database connection issues
   - Verify DATABASE_URL is correct
   - Check Neon dashboard for connection limits
   - Ensure `?sslmode=require` is in connection string

2. **Database connection fails**: SSL/TLS issues
   - Neon requires SSL: ensure connection string has `?sslmode=require`
   - Check Neon project status in dashboard

3. **S3 access**: Verify IAM permissions for Lambda role

4. **Migration fails**: Check database credentials and connectivity
   ```bash
   python3 scripts/migrate-database.py \
     --database-url "your-url" \
     --force
   ```

### Useful Commands

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name manga-reader-serverless

# View Lambda logs
aws logs tail /aws/lambda/manga-reader-manga-api --follow

# Test database connection
python3 scripts/migrate-database.py \
  --database-url "postgresql://..." \
  --force

# Update Lambda code only
cd lambda && \
pip install -r requirements.txt -t . --platform manylinux2014_x86_64 --only-binary=:all: && \
zip -r ../update.zip . && \
aws lambda update-function-code \
  --function-name manga-reader-manga-api \
  --zip-file fileb://../update.zip
```

## Development

### Local Testing

1. **Set up environment**:
   ```bash
   export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   export S3_BUCKET="your-bucket-name"
   export ENVIRONMENT="manga-reader"
   ```

2. **Install dependencies**:
   ```bash
   cd lambda
   pip install -r requirements.txt
   pip install boto3  # For local testing only (included in Lambda runtime)
   ```

3. **Run migration**:
   ```bash
   python3 scripts/migrate-database.py --database-url "$DATABASE_URL"
   ```

### Adding New Endpoints

1. Add route in `infrastructure/03-serverless.yaml`
2. Implement handler in `lambda/lambda_function.py`
3. Test with `test-api.sh`
4. Deploy with `deploy.sh`

## Migration from VPC/RDS Architecture

If you're migrating from the old VPC-based architecture:

1. **Export data from RDS**:
   ```bash
   pg_dump -h your-rds-endpoint -U username -d dbname > backup.sql
   ```

2. **Import to Neon**:
   ```bash
   psql "postgresql://user:password@host/dbname?sslmode=require" < backup.sql
   ```

3. **Delete old stacks** (after verifying migration):
   ```bash
   aws cloudformation delete-stack --stack-name manga-reader-serverless
   aws cloudformation delete-stack --stack-name manga-reader-database
   aws cloudformation delete-stack --stack-name manga-reader-network
   ```

4. **Deploy new architecture**:
   ```bash
   ./deploy.sh --database-url "your-neon-url"
   ```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review CloudWatch logs for Lambda errors
3. Check Neon dashboard for database issues
4. Verify SSL is enabled in connection string
5. Create an issue in the repository

## Links

- Neon Documentation: https://neon.tech/docs
- Neon Console: https://console.neon.tech
- AWS Lambda Docs: https://docs.aws.amazon.com/lambda
- API Gateway Docs: https://docs.aws.amazon.com/apigateway
