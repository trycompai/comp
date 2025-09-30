import { s3Client } from '@/app/s3';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId parameter' }, { status: 400 });
    }

    // List objects in the organization's folder
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: process.env.TASKS_AUTOMATION_BUCKET,
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
