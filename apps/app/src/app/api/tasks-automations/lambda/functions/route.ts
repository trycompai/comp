import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const DEFAULTS = {
  region: 'us-east-1',
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');
    const bucket = process.env.TASKS_AUTOMATION_BUCKET;
    const region = url.searchParams.get('region') || DEFAULTS.region;
    const taskId = url.searchParams.get('taskId');

    const credentials =
      process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY as string,
          }
        : undefined;

    const s3 = new S3Client({ region, credentials });
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${orgId}/` }));
    const items = (res.Contents || [])
      .map((o) => ({ key: o.Key!, size: o.Size ?? 0, lastModified: o.LastModified }))
      .filter((o) => o.key && o.key.endsWith('.js'));

    // Optional: if taskId provided, also return its text content inline
    let content: string | undefined;
    if (taskId) {
      try {
        const key = `${orgId}/${taskId}.js`;
        console.log(`[S3 API] Fetching object: ${bucket}/${key}`);
        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const body = await obj.Body?.transformToString('utf-8');
        content = body;
        console.log(`[S3 API] Fetched content:`, {
          key,
          contentLength: body?.length,
          firstLine: body?.split('\n')[0],
          lastModified: obj.LastModified,
          etag: obj.ETag,
        });
      } catch (error: any) {
        if (error.Code === 'NoSuchKey') {
          console.log(`[S3 API] Key not found: ${orgId}/${taskId}.js`);
          return NextResponse.json({ error: 'Function not found' }, { status: 404 });
        }
        throw error;
      }
    }

    return NextResponse.json(
      {
        bucket,
        region,
        orgId,
        items,
        content,
        taskId: taskId || undefined,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    console.error('Error listing S3 objects', error);
    return NextResponse.json({ error: 'Failed to list functions' }, { status: 500 });
  }
}
