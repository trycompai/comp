import { auth } from '@/app/lib/auth';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/utils/s3';
import { DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db';
import { Buffer } from 'node:buffer';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9.-]/g, '_');

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const policyIdValue = formData.get('policyId');
  const policyName = formData.get('policyName');
  const organizationId = formData.get('organizationId') as string;
  const files = formData.getAll('files');

  const policyId = typeof policyIdValue === 'string' ? Number(policyIdValue) : null;
  const userId = session.user.id;

  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 400 });
  }

  if (!policyId || Number.isNaN(policyId)) {
    return NextResponse.json({ error: 'Invalid policyId' }, { status: 400 });
  }

  if (typeof policyName !== 'string' || policyName.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid policyName' }, { status: 400 });
  }

  if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
    return NextResponse.json({ error: 'File upload service is not available' }, { status: 500 });
  }

  const uploads: Array<{ fileName: string; key: string }> = [];
  const cleanupPartialUploads = async () => {
    if (uploads.length === 0) return;
    try {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Delete: {
            Objects: uploads.map((upload) => ({ Key: upload.key })),
          },
        }),
      );
    } catch (error) {
      console.error('Failed to cleanup partial policy uploads from S3', { error, policyId });
    }
  };

  for (const fileEntry of files) {
    if (!(fileEntry instanceof File)) continue;

    if (!fileEntry.type.startsWith('image/')) {
      await cleanupPartialUploads();
      return NextResponse.json({ error: `Only image files are allowed (${fileEntry.name})` }, { status: 400 });
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      await cleanupPartialUploads();
      return NextResponse.json({ error: `Image ${fileEntry.name} must be less than 5MB` }, { status: 400 });
    }

    const timestamp = Date.now();
    const sanitized = sanitizeFileName(fileEntry.name);
    const key = `${organizationId}/fleet-policies/${policyId}/${timestamp}-${sanitized}`;

    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: fileEntry.type,
    });

    try {
      await s3Client.send(putCommand);
    } catch (error) {
      await cleanupPartialUploads();
      console.error('Failed to upload policy evidence to S3', { error, policyId, fileName: fileEntry.name });
      return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
    }
    uploads.push({ fileName: fileEntry.name, key });
  }

  try {
    const existing = await db.fleetPolicyResult.findFirst({
      where: {
        userId,
        organizationId,
        fleetPolicyId: policyId,
      },
    });

    if (existing) {
      const previousKeys = existing.attachments ?? [];

      const updated = await db.fleetPolicyResult.update({
        where: { id: existing.id },
        data: {
          attachments: uploads.map((upload) => upload.key),
          fleetPolicyResponse: uploads.length > 0 ? 'pass' : 'fail',
          fleetPolicyName: policyName,
        },
      });

      if (previousKeys.length > 0) {
        try {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: APP_AWS_ORG_ASSETS_BUCKET,
              Delete: {
                Objects: previousKeys.map((key) => ({ Key: key })),
              },
            }),
          );
        } catch (error) {
          console.error('Failed to delete previous policy attachments from S3', {
            error,
            policyId: updated.fleetPolicyId,
          });
        }
      }
    } else {
      await db.fleetPolicyResult.create({
        data: {
          userId,
          organizationId,
          fleetPolicyId: policyId,
          fleetPolicyName: policyName,
          fleetPolicyResponse: uploads.length > 0 ? 'pass' : 'fail',
          attachments: uploads.map((upload) => upload.key),
        },
      });
    }
  } catch (error) {
    await cleanupPartialUploads();
    console.error('Failed to save fleet policy result', { error, policyId, organizationId, userId });
    return NextResponse.json({ error: 'Failed to save policy result' }, { status: 500 });
  }

  return NextResponse.json({ success: true, uploads });
}
