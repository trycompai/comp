import { auth } from '@/app/lib/auth';
import { validateMemberAndOrg } from '@/app/api/download-agent/utils';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/utils/s3';
import { DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const organizationId = req.nextUrl.searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization ID' }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const member = await validateMemberAndOrg(session.user.id, organizationId);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

export async function DELETE(req: NextRequest) {
  const organizationId = req.nextUrl.searchParams.get('organizationId');
  const policyIdParam = req.nextUrl.searchParams.get('policyId');

  if (!organizationId) {
    return NextResponse.json({ error: 'No organization ID' }, { status: 400 });
  }

  const policyId = policyIdParam ? parseInt(policyIdParam, 10) : NaN;
  if (Number.isNaN(policyId)) {
    return NextResponse.json({ error: 'Invalid or missing policy ID' }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const member = await validateMemberAndOrg(session.user.id, organizationId);
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const where = {
    organizationId,
    fleetPolicyId: policyId,
    userId: session.user.id,
  };

  const recordsToDelete = await db.fleetPolicyResult.findMany({
    where,
    select: { attachments: true },
  });

  const allKeys = recordsToDelete.flatMap((r) => r.attachments ?? []).filter(Boolean);

  const S3_DELETE_MAX_KEYS = 1000;

  if (s3Client && APP_AWS_ORG_ASSETS_BUCKET && allKeys.length > 0) {
    try {
      for (let i = 0; i < allKeys.length; i += S3_DELETE_MAX_KEYS) {
        const batch = allKeys.slice(i, i + S3_DELETE_MAX_KEYS);
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: APP_AWS_ORG_ASSETS_BUCKET,
            Delete: {
              Objects: batch.map((key) => ({ Key: key })),
            },
          }),
        );
      }
    } catch (error) {
      console.error('Failed to delete policy attachment objects from S3', {
        error,
        policyId,
        organizationId,
        keyCount: allKeys.length,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to remove screenshots from storage. Please try again.',
        },
        { status: 503 },
      );
    }
  }

  const result = await db.fleetPolicyResult.deleteMany({ where });

  return NextResponse.json({
    success: true,
    deletedCount: result.count,
  });
}
