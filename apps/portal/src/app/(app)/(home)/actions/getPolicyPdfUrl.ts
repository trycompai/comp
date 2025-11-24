'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, s3Client } from '@/utils/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import { z } from 'zod';

export const getPolicyPdfUrl = authActionClient
  .inputSchema(z.object({ policyId: z.string() }))
  .metadata({
    name: 'getPolicyPdfUrl',
    track: {
      event: 'portal-get-policy-pdf-url',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId } = parsedInput;
    const { user } = ctx;

    if (!user) {
      throw new Error('Unauthorized');
    }

    try {
      const policy = await db.policy.findUnique({
        where: { id: policyId, status: 'published' },
        select: { pdfUrl: true, organizationId: true },
      });

      if (!policy?.pdfUrl) {
        return { success: false, error: 'No PDF found for this policy.' };
      }

      const member = await db.member.findFirst({
        where: { userId: user.id, organizationId: policy.organizationId, deactivated: false },
      });

      if (!member) {
        return { success: false, error: 'Access denied.' };
      }

      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: policy.pdfUrl,
      });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

      return { success: true, data: signedUrl };
    } catch (error) {
      console.error('Error generating signed URL for portal:', error);
      return { success: false, error: 'Could not retrieve PDF.' };
    }
  });
