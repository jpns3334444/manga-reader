#!/usr/bin/env python3

import json
import psycopg2
import boto3
import argparse
import sys
import os

def get_database_connection(secret_arn, region='us-east-1'):
    """Get database connection using credentials from Secrets Manager."""
    try:
        secrets_client = boto3.client('secretsmanager', region_name=region)
        response = secrets_client.get_secret_value(SecretId=secret_arn)
        secret = json.loads(response['SecretString'])

        connection = psycopg2.connect(
            host=secret['host'],
            port=secret['port'],
            database=secret['dbname'],
            user=secret['username'],
            password=secret['password']
        )
        return connection
    except Exception as e:
        print(f"Database connection failed: {str(e)}")
        raise

def run_migration(connection, schema_file):
    """Run database migration from schema file."""
    try:
        with open(schema_file, 'r') as f:
            schema_sql = f.read()

        cursor = connection.cursor()
        cursor.execute(schema_sql)
        connection.commit()
        cursor.close()
        print("Database migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        connection.rollback()
        return False

def check_database_status(connection):
    """Check if database tables exist."""
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('manga', 'chapters', 'chapter_pages')
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        cursor.close()

        print(f"Existing tables: {existing_tables}")
        return existing_tables
    except Exception as e:
        print(f"Failed to check database status: {str(e)}")
        return []

def main():
    parser = argparse.ArgumentParser(description='Migrate manga reader database schema')
    parser.add_argument('--secret-arn', required=True,
                       help='ARN of the Secrets Manager secret containing database credentials')
    parser.add_argument('--region', default='us-east-1',
                       help='AWS region (default: us-east-1)')
    parser.add_argument('--schema-file', default='database/schema.sql',
                       help='Path to schema SQL file (default: database/schema.sql)')
    parser.add_argument('--force', action='store_true',
                       help='Force migration even if tables exist')

    args = parser.parse_args()

    # Check if schema file exists
    if not os.path.exists(args.schema_file):
        print(f"Schema file not found: {args.schema_file}")
        sys.exit(1)

    try:
        # Connect to database
        print(f"Connecting to database using secret: {args.secret_arn}")
        connection = get_database_connection(args.secret_arn, args.region)

        # Check current database status
        existing_tables = check_database_status(connection)

        if existing_tables and not args.force:
            print("Database tables already exist. Use --force to recreate them.")
            print("Existing tables:", existing_tables)
            sys.exit(0)

        if existing_tables and args.force:
            print("Forcing migration - existing tables will be recreated")

        # Run migration
        print(f"Running migration from: {args.schema_file}")
        if run_migration(connection, args.schema_file):
            print("Migration completed successfully!")
        else:
            print("Migration failed!")
            sys.exit(1)

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == '__main__':
    main()