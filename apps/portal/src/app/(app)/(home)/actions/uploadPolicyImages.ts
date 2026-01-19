'use server';

import { authActionClient } from '@/actions/safe-action';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/utils/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';

const uploadPolicyImagesSchema = z.object({
  policyId: z.string(),
  images: z
    .array(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64 encoded
      }),
    )
    .min(1, 'At least one image is required'),
});

export const uploadPolicyImagesAction = authActionClient
  .inputSchema(uploadPolicyImagesSchema)
  .metadata({
    name: 'upload-policy-images',
    track: {
      event: 'upload-policy-images',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, images } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;

    if (!organizationId) {
      throw new Error('No active organization');
    }

    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      throw new Error('File upload service is not available');
    }

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image
    const uploads: Array<{ fileName: string; key: string; url: string }> = [];

    for (const image of images) {
      const { fileName, fileType, fileData } = image;

      if (!fileType.startsWith('image/')) {
        throw new Error(`Only image files are allowed (${fileName})`);
      }

      const fileBuffer = Buffer.from(fileData, 'base64');
      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Image ${fileName} must be less than 5MB`);
      }

      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `${organizationId}/policies/${policyId}/${timestamp}-${sanitizedFileName}`;

      const putCommand = new PutObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: fileType,
      });
      await s3Client.send(putCommand);
      
      const getCommand = new GetObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: key,
      });
      const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      uploads.push({ fileName, key, url: signedUrl });
    }

    return {
      success: true,
      uploads,
    };
  });
