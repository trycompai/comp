'use server';

import { BUCKET_NAME, s3Client } from '@/app/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authActionClient } from '../safe-action';

const deletePolicySchema = z.object({
  id: z.string(),
  entityId: z.string(),
});

export const deletePolicyAction = authActionClient
  .inputSchema(deletePolicySchema)
  .metadata({
    name: 'delete-policy',
    track: {
      event: 'delete-policy',
      description: 'Delete Policy',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized',
      };
    }

    try {
      const policy = await db.policy.findUnique({
        where: {
          id,
          organizationId: activeOrganizationId,
        },
        include: {
          versions: {
            select: { pdfUrl: true },
          },
        },
      });

      if (!policy) {
        return {
          success: false,
          error: 'Policy not found',
        };
      }

      // Clean up S3 files before cascade delete
      if (s3Client && BUCKET_NAME) {
        const pdfUrlsToDelete: string[] = [];

        // Add policy-level PDF if exists
        if (policy.pdfUrl) {
          pdfUrlsToDelete.push(policy.pdfUrl);
        }

        // Add all version PDFs
        for (const version of policy.versions) {
          if (version.pdfUrl) {
            pdfUrlsToDelete.push(version.pdfUrl);
          }
        }

        // Delete all PDFs from S3
        await Promise.allSettled(
          pdfUrlsToDelete.map((pdfUrl) =>
            s3Client.send(
              new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: pdfUrl,
              }),
            ),
          ),
        );
      }

      // Delete the policy (versions are cascade deleted)
      await db.policy.delete({
        where: { id },
      });

      // Revalidate paths to update UI
      revalidatePath(`/${activeOrganizationId}/policies`);
      revalidateTag('policies', 'max');

      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Failed to delete policy',
      };
    }
  });
