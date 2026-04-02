import { auth } from '@/utils/auth';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = req.nextUrl.searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 400 });
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
      deactivated: false,
    },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  // Enforce that the requested key belongs to the caller's organization
  const orgPrefix = `${organizationId}/`;
  if (!key.startsWith(orgPrefix)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
