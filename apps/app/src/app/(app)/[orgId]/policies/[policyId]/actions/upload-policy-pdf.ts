'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, s3Client } from '@/app/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { db, PolicyDisplayFormat } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const uploadPolicyPdfSchema = z.object({
  policyId: z.string(),
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
    const { policyId, fileName, fileType, fileData } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    if (!s3Client || !BUCKET_NAME) {
      return { success: false, error: 'File storage is not configured.' };
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `${organizationId}/policies/${policyId}/${Date.now()}-${sanitizedFileName}`;

    try {
      const fileBuffer = Buffer.from(fileData, 'base64');
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileType,
      });

      await s3Client.send(command);

      // After a successful upload, update the policy to store the S3 Key
      await db.policy.update({
        where: { id: policyId, organizationId },
        data: {
          pdfUrl: s3Key,
          displayFormat: PolicyDisplayFormat.PDF,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return { success: true, data: { s3Key } };
    } catch (error) {
      console.error('Error uploading policy PDF to S3:', error);
      return { success: false, error: 'Failed to upload PDF.' };
    }
  });
