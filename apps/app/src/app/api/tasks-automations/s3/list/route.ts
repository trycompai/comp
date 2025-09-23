import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3 = new S3Client({ region: 'us-east-1' });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId parameter' }, { status: 400 });
    }

    // List objects in the organization's folder
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: 'comp-testing-lambda-tasks',
        Prefix: `${orgId}/`,
        MaxKeys: 100,
      }),
    );

    const items = (response.Contents || [])
      .filter((item) => item.Key?.endsWith('.js'))
      .map((item) => ({
        key: item.Key!,
        lastModified: item.LastModified,
        size: item.Size,
      }));

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    return NextResponse.json(
      { error: 'Failed to list scripts', details: (error as Error)?.message },
      { status: 500 },
    );
  }
}
