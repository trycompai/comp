'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, s3Client } from '@/app/s3';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { db, PolicyDisplayFormat } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const uploadPolicyPdfSchema = z.object({
  policyId: z.string(),
  versionId: z.string().optional(), // If provided, upload to this version
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // Base64 encoded file content
});

export const uploadPolicyPdfAction = authActionClient
  .inputSchema(uploadPolicyPdfSchema)
  .metadata({
    name: 'upload-policy-pdf',
    track: {
      event: 'upload-policy-pdf-s3',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, versionId, fileName, fileType, fileData } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    if (!s3Client || !BUCKET_NAME) {
      return { success: false, error: 'File storage is not configured.' };
    }

    try {
      // Verify policy belongs to organization
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId },
        select: {
          id: true,
          status: true,
          pdfUrl: true,
          currentVersionId: true,
          pendingVersionId: true,
        },
      });

      if (!policy) {
        return { success: false, error: 'Policy not found' };
      }

      let oldPdfUrl: string | null = null;

      if (versionId) {
        // Upload to specific version
        const version = await db.policyVersion.findUnique({
          where: { id: versionId },
          select: { id: true, policyId: true, pdfUrl: true, version: true },
        });

        if (!version || version.policyId !== policyId) {
          return { success: false, error: 'Version not found' };
        }

        // Don't allow uploading PDF to the published version
        if (version.id === policy.currentVersionId && policy.status === 'published') {
          return { success: false, error: 'Cannot upload PDF to the published version' };
        }
        if (version.id === policy.pendingVersionId) {
          return { success: false, error: 'Cannot upload PDF to a version pending approval' };
        }

        oldPdfUrl = version.pdfUrl;

        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const s3Key = `${organizationId}/policies/${policyId}/v${version.version}-${Date.now()}-${sanitizedFileName}`;

        // Upload to S3
        const fileBuffer = Buffer.from(fileData, 'base64');
        const putCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: fileType,
        });
        await s3Client.send(putCommand);

        // Update version
        await db.policyVersion.update({
          where: { id: versionId },
          data: { pdfUrl: s3Key },
        });

        // Delete old PDF if it exists and is different
        if (oldPdfUrl && oldPdfUrl !== s3Key) {
          try {
            await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldPdfUrl }));
          } catch (error) {
            console.error('Error cleaning up old version PDF from S3:', error);
          }
        }

        revalidatePath(`/${organizationId}/policies/${policyId}`);
        return { success: true, data: { s3Key } };
      }

      // Legacy: upload to policy level
      oldPdfUrl = policy.pdfUrl;
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `${organizationId}/policies/${policyId}/${Date.now()}-${sanitizedFileName}`;

      const fileBuffer = Buffer.from(fileData, 'base64');
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileType,
      });
      await s3Client.send(putCommand);

      await db.policy.update({
        where: { id: policyId, organizationId },
        data: {
          pdfUrl: s3Key,
          displayFormat: PolicyDisplayFormat.PDF,
        },
      });

      if (oldPdfUrl && oldPdfUrl !== s3Key) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldPdfUrl }));
        } catch (error) {
          console.error('Error cleaning up old policy PDF from S3:', error);
        }
      }

      revalidatePath(`/${organizationId}/policies/${policyId}`);
      return { success: true, data: { s3Key } };
    } catch (error) {
      console.error('Error uploading policy PDF to S3:', error);
      return { success: false, error: 'Failed to upload PDF.' };
    }
  });
