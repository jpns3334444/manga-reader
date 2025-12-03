import json
import os
import boto3
import urllib.request
import urllib.error
import logging
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cloudfront_client = boto3.client('cloudfront')

NEXTJS_URL = os.environ['NEXTJS_URL']
REVALIDATION_SECRET = os.environ['REVALIDATION_SECRET']
CLOUDFRONT_DISTRIBUTION_ID = os.environ['CLOUDFRONT_DISTRIBUTION_ID']


def revalidate_nextjs_paths(paths):
    """Call the Next.js revalidation API endpoint."""
    if not paths:
        return True

    url = f"{NEXTJS_URL}/api/revalidate"
    data = json.dumps({"paths": paths}).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {REVALIDATION_SECRET}'
        },
        method='POST'
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            logger.info(f"Next.js revalidation response: {result}")
            return True
    except urllib.error.HTTPError as e:
        logger.error(f"Next.js revalidation failed: {e.code} {e.reason}")
        return False
    except urllib.error.URLError as e:
        logger.error(f"Next.js revalidation failed: {e.reason}")
        return False


def invalidate_cloudfront_paths(paths):
    """Create a CloudFront invalidation for the given paths."""
    if not paths:
        return True

    try:
        response = cloudfront_client.create_invalidation(
            DistributionId=CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationBatch={
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                },
                'CallerReference': f'manga-reader-{int(time.time() * 1000)}'
            }
        )
        logger.info(f"CloudFront invalidation created: {response['Invalidation']['Id']}")
        return True
    except Exception as e:
        logger.error(f"CloudFront invalidation failed: {str(e)}")
        return False


def get_paths_for_event(event_type, detail):
    """Determine which paths to invalidate based on event type."""
    nextjs_paths = []
    cloudfront_paths = []

    if event_type == 'chapter.created':
        manga_slug = detail.get('manga_slug')
        if manga_slug:
            nextjs_paths.append(f'/manga/{manga_slug}')
        nextjs_paths.append('/')

    elif event_type == 'manga.created':
        nextjs_paths.append('/')

    elif event_type == 'manga.updated':
        manga_slug = detail.get('manga_slug')
        if manga_slug:
            nextjs_paths.append(f'/manga/{manga_slug}')
        # Always invalidate homepage since it shows latest updates
        nextjs_paths.append('/')

    elif event_type == 'manga.deleted':
        manga_slug = detail.get('manga_slug')
        if manga_slug:
            nextjs_paths.append(f'/manga/{manga_slug}')
        nextjs_paths.append('/')

    elif event_type == 'rankings.updated':
        nextjs_paths.append('/')

    elif event_type == 'cover.updated':
        image_path = detail.get('image_path')
        if image_path:
            # CloudFront paths must start with /
            cf_path = f'/{image_path}' if not image_path.startswith('/') else image_path
            cloudfront_paths.append(cf_path)
        # Also invalidate the manga page and homepage since cover changed
        manga_slug = detail.get('manga_slug')
        if manga_slug:
            nextjs_paths.append(f'/manga/{manga_slug}')
        nextjs_paths.append('/')

    return nextjs_paths, cloudfront_paths


def lambda_handler(event, context):
    """Handle EventBridge events and trigger appropriate invalidations."""
    logger.info(f"Received event: {json.dumps(event)}")

    try:
        event_type = event.get('detail-type', '')
        detail = event.get('detail', {})

        if not event_type:
            logger.warning("No event type in event")
            return {'statusCode': 400, 'body': 'Missing event type'}

        nextjs_paths, cloudfront_paths = get_paths_for_event(event_type, detail)

        logger.info(f"Event type: {event_type}")
        logger.info(f"Next.js paths to invalidate: {nextjs_paths}")
        logger.info(f"CloudFront paths to invalidate: {cloudfront_paths}")

        results = {
            'event_type': event_type,
            'nextjs_revalidated': [],
            'cloudfront_invalidated': []
        }

        # Revalidate Next.js paths
        if nextjs_paths:
            if revalidate_nextjs_paths(nextjs_paths):
                results['nextjs_revalidated'] = nextjs_paths

        # Invalidate CloudFront paths
        if cloudfront_paths:
            if invalidate_cloudfront_paths(cloudfront_paths):
                results['cloudfront_invalidated'] = cloudfront_paths

        logger.info(f"Invalidation results: {results}")

        return {
            'statusCode': 200,
            'body': json.dumps(results)
        }

    except Exception as e:
        logger.error(f"Error processing event: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
