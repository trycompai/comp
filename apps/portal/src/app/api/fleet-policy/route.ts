import { auth } from '@/app/lib/auth';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const organizationId = session.session?.activeOrganizationId;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 400 });
  }

  const results = await db.fleetPolicyResult.findMany({
    where: { organizationId, userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
    return NextResponse.json({ success: true, data: results });
  }

  const withSignedUrls = await Promise.all(
    results.map(async (result) => {
      const signedAttachments = await Promise.all(
        result.attachments.map(async (key) => {
          try {
            const command = new GetObjectCommand({
              Bucket: APP_AWS_ORG_ASSETS_BUCKET,
              Key: key,
            });
            return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          } catch {
            return key;
          }
        }),
      );

      return {
        ...result,
        attachments: signedAttachments,
      };
    }),
  );

  return NextResponse.json({ success: true, data: withSignedUrls });
}
