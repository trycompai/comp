'use server';

import { authActionClient } from '@/actions/safe-action';
import { BUCKET_NAME, s3Client } from '@/app/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import { z } from 'zod';

export const getPolicyPdfUrlAction = authActionClient
  .inputSchema(z.object({ policyId: z.string() }))
  .metadata({
    name: 'get-policy-pdf-url',
    track: {
      event: 'get-policy-pdf-url-s3',
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

    if (!s3Client || !BUCKET_NAME) {
      return { success: false, error: 'File storage is not configured.' };
    }

    try {
      const policy = await db.policy.findUnique({
        where: { id: policyId, organizationId },
        select: { pdfUrl: true },
      });

      if (!policy?.pdfUrl) {
        return { success: false, error: 'No PDF found for this policy.' };
      }

      // Generate a temporary, secure URL for the client to render the PDF from the private bucket.
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: policy.pdfUrl,
        ResponseContentDisposition: 'inline',
        ResponseContentType: 'application/pdf',
      });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // URL is valid for 15 minutes

      return { success: true, data: signedUrl };
    } catch (error) {
      console.error('Error generating signed URL for policy PDF:', error);
      return { success: false, error: 'Could not retrieve PDF.' };
    }
  });
