import json
import os
import boto3
import psycopg2
import psycopg2.extras
from urllib.parse import unquote
import logging
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3_client = boto3.client('s3')

DATABASE_URL = os.environ['DATABASE_URL']
S3_BUCKET = os.environ['S3_BUCKET']
ENVIRONMENT = os.environ['ENVIRONMENT']

def get_database_connection():
    """Get database connection using DATABASE_URL environment variable."""
    try:
        connection = psycopg2.connect(DATABASE_URL)
        return connection
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise

def create_response(status_code, body, headers=None):
    """Create HTTP response with CORS headers."""
    default_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }

    if headers:
        default_headers.update(headers)

    return {
        'statusCode': status_code,
        'headers': default_headers,
        'body': json.dumps(body, default=str)
    }

def generate_presigned_url(s3_key, expiration=3600):
    """Generate presigned URL for S3 object."""
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {str(e)}")
        return None

def get_manga_list(connection):
    """Get list of all manga series."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, title, slug, description, cover_image_url, status,
               created_at, updated_at
        FROM manga
        ORDER BY title
    """)
    manga_list = cursor.fetchall()
    cursor.close()
    return manga_list

def get_manga_by_id(connection, manga_id):
    """Get specific manga by ID."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, title, slug, description, cover_image_url, status,
               created_at, updated_at
        FROM manga
        WHERE id = %s
    """, (manga_id,))
    manga = cursor.fetchone()
    cursor.close()
    return manga

def get_manga_chapters(connection, manga_id):
    """Get chapters for a specific manga."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, manga_id, chapter_number, title, page_count, created_at
        FROM chapters
        WHERE manga_id = %s
        ORDER BY chapter_number
    """, (manga_id,))
    chapters = cursor.fetchall()
    cursor.close()
    return chapters

def get_chapter_details(connection, chapter_id):
    """Get chapter details with page URLs."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get chapter info
    cursor.execute("""
        SELECT c.id, c.manga_id, c.chapter_number, c.title, c.page_count, c.created_at,
               m.title as manga_title
        FROM chapters c
        JOIN manga m ON c.manga_id = m.id
        WHERE c.id = %s
    """, (chapter_id,))
    chapter = cursor.fetchone()

    if not chapter:
        cursor.close()
        return None

    # Get chapter pages
    cursor.execute("""
        SELECT id, page_number, image_key
        FROM chapter_pages
        WHERE chapter_id = %s
        ORDER BY page_number
    """, (chapter_id,))
    pages = cursor.fetchall()

    # Generate presigned URLs for images
    for page in pages:
        page['image_url'] = generate_presigned_url(page['image_key'])

    chapter['pages'] = pages
    cursor.close()
    return chapter

def create_manga(connection, manga_data):
    """Create new manga series."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""
        INSERT INTO manga (title, slug, description, cover_image_url, status)
        VALUES (%(title)s, %(slug)s, %(description)s, %(cover_image_url)s, %(status)s)
        RETURNING id, title, slug, description, cover_image_url, status, created_at, updated_at
    """, manga_data)

    manga = cursor.fetchone()
    connection.commit()
    cursor.close()
    return manga

def create_chapter(connection, chapter_data):
    """Create new chapter."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""
        INSERT INTO chapters (manga_id, chapter_number, title, page_count)
        VALUES (%(manga_id)s, %(chapter_number)s, %(title)s, %(page_count)s)
        RETURNING id, manga_id, chapter_number, title, page_count, created_at
    """, chapter_data)

    chapter = cursor.fetchone()

    # Create chapter pages if provided
    if 'pages' in chapter_data and chapter_data['pages']:
        for page_data in chapter_data['pages']:
            cursor.execute("""
                INSERT INTO chapter_pages (chapter_id, page_number, image_key)
                VALUES (%s, %s, %s)
            """, (chapter['id'], page_data['page_number'], page_data['image_key']))

    connection.commit()
    cursor.close()
    return chapter

def lambda_handler(event, context):
    """Main Lambda handler function."""
    try:
        logger.info(f"Event: {json.dumps(event)}")

        http_method = event.get('requestContext', {}).get('http', {}).get('method')
        path = event.get('requestContext', {}).get('http', {}).get('path', '')
        path_parameters = event.get('pathParameters') or {}

        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return create_response(200, {'message': 'CORS preflight'})

        # Get database connection
        connection = get_database_connection()

        try:
            # Route handling
            if http_method == 'GET':
                if path == '/manga':
                    # GET /manga - List all manga
                    manga_list = get_manga_list(connection)
                    return create_response(200, {'manga': manga_list})

                elif path.startswith('/manga/') and path.endswith('/chapters'):
                    # GET /manga/{id}/chapters - List chapters for manga
                    manga_id = path_parameters.get('id')
                    if not manga_id:
                        return create_response(400, {'error': 'Missing manga ID'})

                    chapters = get_manga_chapters(connection, manga_id)
                    return create_response(200, {'chapters': chapters})

                elif path.startswith('/manga/'):
                    # GET /manga/{id} - Get specific manga
                    manga_id = path_parameters.get('id')
                    if not manga_id:
                        return create_response(400, {'error': 'Missing manga ID'})

                    manga = get_manga_by_id(connection, manga_id)
                    if not manga:
                        return create_response(404, {'error': 'Manga not found'})

                    return create_response(200, {'manga': manga})

                elif path.startswith('/chapters/'):
                    # GET /chapters/{id} - Get chapter details
                    chapter_id = path_parameters.get('id')
                    if not chapter_id:
                        return create_response(400, {'error': 'Missing chapter ID'})

                    chapter = get_chapter_details(connection, chapter_id)
                    if not chapter:
                        return create_response(404, {'error': 'Chapter not found'})

                    return create_response(200, {'chapter': chapter})

            elif http_method == 'POST':
                # Parse request body
                body = event.get('body', '{}')
                if isinstance(body, str):
                    body = json.loads(body)

                if path == '/manga':
                    # POST /manga - Create new manga
                    required_fields = ['title', 'slug']
                    if not all(field in body for field in required_fields):
                        return create_response(400, {'error': 'Missing required fields: title, slug'})

                    manga = create_manga(connection, body)
                    return create_response(201, {'manga': manga})

                elif path == '/chapters':
                    # POST /chapters - Create new chapter
                    required_fields = ['manga_id', 'chapter_number', 'page_count']
                    if not all(field in body for field in required_fields):
                        return create_response(400, {'error': 'Missing required fields: manga_id, chapter_number, page_count'})

                    chapter = create_chapter(connection, body)
                    return create_response(201, {'chapter': chapter})

            # Route not found
            return create_response(404, {'error': 'Route not found'})

        finally:
            connection.close()

    except psycopg2.Error as e:
        logger.error(f"Database error: {str(e)}")
        return create_response(500, {'error': 'Database error'})

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return create_response(400, {'error': 'Invalid JSON in request body'})

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return create_response(500, {'error': 'Internal server error'})
