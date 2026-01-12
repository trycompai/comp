'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, s3Client } from '@/app/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db, PolicyDisplayFormat } from '@db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const deletePolicyPdfSchema = z.object({
  policyId: z.string(),
});

export const deletePolicyPdfAction = authActionClient
  .inputSchema(deletePolicyPdfSchema)
  .metadata({
    name: 'delete-policy-pdf',
    track: {
      event: 'delete-policy-pdf-s3',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    try {
      // Get the policy to find the pdfUrl
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId },
        select: { pdfUrl: true },
      });

      if (!policy) {
        return { success: false, error: 'Policy not found' };
      }

      // Delete from S3 if pdfUrl exists
      if (policy.pdfUrl && s3Client && BUCKET_NAME) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: policy.pdfUrl,
          });
          await s3Client.send(deleteCommand);
        } catch (error) {
          // Log error but continue with database update
          console.error('Error deleting PDF from S3:', error);
        }
      }

      // Update policy to remove pdfUrl and switch back to EDITOR format
      await db.policy.update({
        where: { id: policyId, organizationId },
        data: {
          pdfUrl: null,
          displayFormat: PolicyDisplayFormat.EDITOR,
        },
      });

      const headersList = await headers();
      let path = headersList.get('x-pathname') || headersList.get('referer') || '';
      path = path.replace(/\/[a-z]{2}\//, '/');
      revalidatePath(path);

      return { success: true };
    } catch (error) {
      console.error('Error deleting policy PDF:', error);
      return { success: false, error: 'Failed to delete PDF.' };
    }
  });
