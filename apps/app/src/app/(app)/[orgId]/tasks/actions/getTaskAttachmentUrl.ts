'use server';

import { BUCKET_NAME, extractS3KeyFromUrl, s3Client } from '@/app/s3'; // Import shared client
import { auth } from '@/utils/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AttachmentEntityType, db } from '@db';
import { headers } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  attachmentId: z.string(),
});

export const getTaskAttachmentUrl = async (input: z.infer<typeof schema>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { attachmentId } = input;
  const organizationId = session?.session?.activeOrganizationId;

  if (!organizationId) {
    return {
      success: false,
      error: 'Not authorized - no organization found',
    } as const;
  }

  try {
    // 1. Find the attachment and verify ownership/type
    const attachment = await db.attachment.findUnique({
      where: {
        id: attachmentId,
        organizationId: organizationId,
        entityType: AttachmentEntityType.task, // Ensure it's a task attachment
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: 'Attachment not found or access denied',
      } as const;
    }

    // 2. Extract S3 key from the stored URL
    let key: string;
    try {
      key = extractS3KeyFromUrl(attachment.url);
    } catch (extractError) {
      console.error('Error extracting S3 key for attachment:', attachmentId, extractError);
      return {
        success: false,
        error: 'Could not process attachment URL',
      } as const;
    }

    // 3. Generate Signed URL using shared client
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME!, // Use imported bucket name
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });

      if (!signedUrl) {
        // This case is unlikely if getSignedUrl doesn't throw, but good to check
        console.error('getSignedUrl returned undefined for key:', key);
        return {
          success: false,
          error: 'Failed to generate signed URL',
        } as const;
      }

      // 4. Return Success
      return { success: true, data: { signedUrl } };
    } catch (s3Error) {
      console.error('S3 getSignedUrl Error:', s3Error);
      // Provide a generic error message to the client
      return {
        success: false,
        error: 'Could not generate access URL for the file',
      } as const;
    }
  } catch (dbError) {
    // Catch potential DB errors during findUnique
    console.error('Database Error fetching attachment:', dbError);
    return {
      success: false,
      error: 'Failed to retrieve attachment details',
    } as const;
  }
};
