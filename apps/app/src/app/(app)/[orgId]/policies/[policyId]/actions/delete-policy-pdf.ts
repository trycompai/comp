'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, s3Client } from '@/app/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db, PolicyDisplayFormat } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const deletePolicyPdfSchema = z.object({
  policyId: z.string(),
  versionId: z.string().optional(), // If provided, delete from this version
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
    const { policyId, versionId } = parsedInput;
    const { session } = ctx;
    const organizationId = session.activeOrganizationId;

    if (!organizationId) {
      return { success: false, error: 'Not authorized' };
    }

    try {
      // Verify policy belongs to organization
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId },
        select: { 
          id: true, 
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
        // Delete PDF from specific version
        const version = await db.policyVersion.findUnique({
          where: { id: versionId },
          select: { id: true, policyId: true, pdfUrl: true },
        });

        if (!version || version.policyId !== policyId) {
          return { success: false, error: 'Version not found' };
        }

        // Don't allow deleting PDF from published or pending versions
        if (version.id === policy.currentVersionId) {
          return { success: false, error: 'Cannot delete PDF from the published version' };
        }
        if (version.id === policy.pendingVersionId) {
          return { success: false, error: 'Cannot delete PDF from a version pending approval' };
        }

        oldPdfUrl = version.pdfUrl;

        // Update version to remove pdfUrl
        await db.policyVersion.update({
          where: { id: versionId },
          data: { pdfUrl: null },
        });
      } else {
        // Legacy: delete from policy level
        oldPdfUrl = policy.pdfUrl;

        await db.policy.update({
          where: { id: policyId, organizationId },
          data: {
            pdfUrl: null,
            displayFormat: PolicyDisplayFormat.EDITOR,
          },
        });
      }

      // Delete from S3 after database is updated
      if (oldPdfUrl && s3Client && BUCKET_NAME) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: oldPdfUrl,
          });
          await s3Client.send(deleteCommand);
        } catch (error) {
          console.error('Error deleting PDF from S3 (orphaned file):', error);
        }
      }

      revalidatePath(`/${organizationId}/policies/${policyId}`);

      return { success: true };
    } catch (error) {
      console.error('Error deleting policy PDF:', error);
      return { success: false, error: 'Failed to delete PDF.' };
    }
  });
