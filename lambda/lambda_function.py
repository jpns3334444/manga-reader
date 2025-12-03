import json
import os
import boto3
import psycopg2
import psycopg2.extras
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

eventbridge_client = boto3.client('events')

DATABASE_URL = os.environ['DATABASE_URL']
CLOUDFRONT_DOMAIN = os.environ['CLOUDFRONT_DOMAIN']
EVENTBRIDGE_BUS_NAME = os.environ.get('EVENTBRIDGE_BUS_NAME', '')

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

def get_cloudfront_url(image_key):
    """Construct CloudFront URL for an image key."""
    if not image_key:
        return None
    return f"https://{CLOUDFRONT_DOMAIN}/{image_key}"


def emit_event(event_type, detail):
    """Emit an event to EventBridge for cache invalidation."""
    if not EVENTBRIDGE_BUS_NAME:
        logger.warning("EVENTBRIDGE_BUS_NAME not configured, skipping event emission")
        return

    try:
        response = eventbridge_client.put_events(
            Entries=[
                {
                    'Source': 'manga-reader',
                    'DetailType': event_type,
                    'Detail': json.dumps(detail),
                    'EventBusName': EVENTBRIDGE_BUS_NAME
                }
            ]
        )
        if response.get('FailedEntryCount', 0) > 0:
            logger.error(f"Failed to emit event: {response}")
        else:
            logger.info(f"Emitted event: {event_type} with detail: {detail}")
    except Exception as e:
        logger.error(f"Failed to emit event {event_type}: {str(e)}")

def process_manga_cover(manga):
    """Generate CloudFront URL for manga cover if it's an S3 key."""
    if manga and manga.get('cover_image_url'):
        cover = manga['cover_image_url']
        # If it looks like an S3 key (not a full URL), generate CloudFront URL
        if cover and not cover.startswith('http'):
            manga['cover_image_url'] = get_cloudfront_url(cover)
    return manga

def process_manga_list_covers(manga_list):
    """Process cover images for a list of manga."""
    for manga in manga_list:
        process_manga_cover(manga)
    return manga_list

def get_manga_list(connection, popular=False):
    """Get list of all manga series."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    limit = "LIMIT 8" if popular else ""
    cursor.execute(f"""
        SELECT id, title, slug, description, cover_image_url, status,
               genres, author, artist, year, created_at, updated_at
        FROM manga
        ORDER BY title
        {limit}
    """)
    manga_list = cursor.fetchall()
    cursor.close()
    return manga_list

def get_latest_manga(connection, limit=20):
    """Get manga sorted by most recent chapter creation date."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT m.id, m.title, m.slug, m.description, m.cover_image_url, m.status,
               m.genres, m.author, m.artist, m.year, m.created_at, m.updated_at,
               c.chapter_number as latest_chapter_number,
               c.title as latest_chapter_title,
               c.created_at as latest_chapter_date
        FROM manga m
        LEFT JOIN LATERAL (
            SELECT chapter_number, title, created_at
            FROM chapters
            WHERE manga_id = m.id
            ORDER BY created_at DESC
            LIMIT 1
        ) c ON true
        ORDER BY COALESCE(c.created_at, m.created_at) DESC
        LIMIT %s
    """, (limit,))
    manga_list = cursor.fetchall()
    cursor.close()
    return manga_list

def get_manga_by_id(connection, manga_id):
    """Get specific manga by ID."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, title, slug, description, cover_image_url, status,
               genres, author, artist, year, created_at, updated_at
        FROM manga
        WHERE id = %s
    """, (manga_id,))
    manga = cursor.fetchone()
    cursor.close()
    return manga


def get_manga_slug_by_id(connection, manga_id):
    """Get manga slug by ID for event emission."""
    cursor = connection.cursor()
    cursor.execute("SELECT slug FROM manga WHERE id = %s", (manga_id,))
    result = cursor.fetchone()
    cursor.close()
    return result[0] if result else None

def get_manga_by_slug(connection, slug):
    """Get specific manga by slug with chapters."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT id, title, slug, description, cover_image_url, status,
               genres, author, artist, year, created_at, updated_at
        FROM manga
        WHERE slug = %s
    """, (slug,))
    manga = cursor.fetchone()
    if manga:
        cursor.execute("""
            SELECT id, manga_id, chapter_number, title, page_count, created_at
            FROM chapters
            WHERE manga_id = %s
            ORDER BY chapter_number
        """, (manga['id'],))
        manga['chapters'] = cursor.fetchall()
    cursor.close()
    return manga

def get_chapter_by_manga_and_number(connection, manga_slug, chapter_number):
    """Get chapter by manga slug and chapter number with pages and prev/next info."""
    cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        SELECT c.id, c.manga_id, c.chapter_number, c.title, c.page_count, c.created_at,
               m.title as manga_title, m.slug as manga_slug
        FROM chapters c
        JOIN manga m ON c.manga_id = m.id
        WHERE m.slug = %s AND c.chapter_number = %s
    """, (manga_slug, chapter_number))
    chapter = cursor.fetchone()

    if not chapter:
        cursor.close()
        return None

    # Get prev/next chapter numbers
    cursor.execute("""
        SELECT chapter_number FROM chapters
        WHERE manga_id = %s AND chapter_number < %s
        ORDER BY chapter_number DESC LIMIT 1
    """, (chapter['manga_id'], chapter_number))
    prev_row = cursor.fetchone()
    chapter['prev_chapter'] = float(prev_row['chapter_number']) if prev_row else None

    cursor.execute("""
        SELECT chapter_number FROM chapters
        WHERE manga_id = %s AND chapter_number > %s
        ORDER BY chapter_number ASC LIMIT 1
    """, (chapter['manga_id'], chapter_number))
    next_row = cursor.fetchone()
    chapter['next_chapter'] = float(next_row['chapter_number']) if next_row else None

    # Get chapter pages
    cursor.execute("""
        SELECT id, page_number, image_key
        FROM chapter_pages
        WHERE chapter_id = %s
        ORDER BY page_number
    """, (chapter['id'],))
    pages = cursor.fetchall()

    # Generate CloudFront URLs for images
    for page in pages:
        page['image_url'] = get_cloudfront_url(page['image_key'])

    chapter['pages'] = pages
    cursor.close()
    return chapter

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

    # Generate CloudFront URLs for images
    for page in pages:
        page['image_url'] = get_cloudfront_url(page['image_key'])

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
        raw_path = event.get('requestContext', {}).get('http', {}).get('path', '')
        # Strip stage prefix from path (e.g., /manga-reader/manga -> /manga)
        stage = event.get('requestContext', {}).get('stage', '')
        path = raw_path[len(f'/{stage}'):] if stage and raw_path.startswith(f'/{stage}') else raw_path
        path_parameters = event.get('pathParameters') or {}

        # Get database connection
        connection = get_database_connection()

        try:
            # Get query parameters
            query_params = event.get('queryStringParameters') or {}

            # Route handling
            if http_method == 'GET':
                if path == '/manga':
                    # GET /manga - List all manga (with optional ?popular=true)
                    popular = query_params.get('popular', '').lower() == 'true'
                    manga_list = get_manga_list(connection, popular=popular)
                    process_manga_list_covers(manga_list)
                    return create_response(200, {'manga': manga_list})

                elif path == '/manga/latest':
                    # GET /manga/latest - Get manga sorted by most recent chapter
                    manga_list = get_latest_manga(connection)
                    process_manga_list_covers(manga_list)
                    return create_response(200, {'manga': manga_list})

                elif path.startswith('/manga/slug/'):
                    # Slug-based routes
                    if '/chapter/' in path:
                        # GET /manga/slug/{slug}/chapter/{num} - Get chapter by slug and number
                        slug = path_parameters.get('slug')
                        chapter_num = path_parameters.get('num')
                        if not slug or not chapter_num:
                            return create_response(400, {'error': 'Missing slug or chapter number'})
                        chapter = get_chapter_by_manga_and_number(connection, slug, float(chapter_num))
                        if not chapter:
                            return create_response(404, {'error': 'Chapter not found'})
                        return create_response(200, {'chapter': chapter})
                    else:
                        # GET /manga/slug/{slug} - Get manga by slug
                        slug = path_parameters.get('slug')
                        if not slug:
                            return create_response(400, {'error': 'Missing slug'})
                        manga = get_manga_by_slug(connection, slug)
                        if not manga:
                            return create_response(404, {'error': 'Manga not found'})
                        process_manga_cover(manga)
                        return create_response(200, {'manga': manga})

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

                    process_manga_cover(manga)
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

                    # Emit event for cache invalidation
                    emit_event('manga.created', {
                        'manga_id': str(manga['id']),
                        'manga_slug': manga['slug']
                    })

                    return create_response(201, {'manga': manga})

                elif path == '/chapters':
                    # POST /chapters - Create new chapter
                    required_fields = ['manga_id', 'chapter_number', 'page_count']
                    if not all(field in body for field in required_fields):
                        return create_response(400, {'error': 'Missing required fields: manga_id, chapter_number, page_count'})

                    chapter = create_chapter(connection, body)

                    # Get manga slug for event
                    manga_slug = get_manga_slug_by_id(connection, body['manga_id'])

                    # Emit event for cache invalidation
                    emit_event('chapter.created', {
                        'manga_id': str(body['manga_id']),
                        'manga_slug': manga_slug,
                        'chapter_number': float(chapter['chapter_number'])
                    })

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
