'use server';

import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
    return NextResponse.json({ error: 'File service unavailable' }, { status: 500 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to generate signed URL', error);
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
  }
}
