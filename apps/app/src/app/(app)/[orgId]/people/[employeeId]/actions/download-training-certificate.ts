'use server';

import { authActionClient } from '@/actions/safe-action';
import { env } from '@/env.mjs';
import { z } from 'zod';

const downloadCertificateSchema = z.object({
  memberId: z.string(),
  organizationId: z.string(),
});

/**
 * Downloads a training certificate PDF for a member by calling the API
 */
export const downloadTrainingCertificate = authActionClient
  .inputSchema(downloadCertificateSchema)
  .metadata({
    name: 'downloadTrainingCertificate',
    track: {
      event: 'downloadTrainingCertificate',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { memberId, organizationId } = parsedInput;
    const { session } = ctx;

    // Verify the caller has access to this organization
    if (session.activeOrganizationId !== organizationId) {
      throw new Error(
        'Unauthorized: You do not have access to this organization',
      );
    }

    // Call the API to generate the certificate
    const apiUrl =
      env.NEXT_PUBLIC_API_URL ||
      process.env.API_BASE_URL ||
      'http://localhost:3333';

    const internalToken = env.INTERNAL_API_TOKEN;
    if (!internalToken) {
      throw new Error('INTERNAL_API_TOKEN not configured');
    }

    const response = await fetch(`${apiUrl}/v1/training/generate-certificate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': internalToken,
      },
      body: JSON.stringify({
        memberId,
        organizationId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate certificate: ${errorText}`);
    }

    // Get the PDF as a buffer and convert to base64
    const pdfBuffer = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    return pdfBase64;
  });
