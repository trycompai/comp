'use server';

import { authActionClient } from '@/actions/safe-action';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateFaviconSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64 encoded
});

export const updateOrganizationFaviconAction = authActionClient
  .inputSchema(updateFaviconSchema)
  .metadata({
    name: 'update-organization-favicon',
    track: {
      event: 'update-organization-favicon',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { fileName, fileType, fileData } = parsedInput;
    const organizationId = ctx.session.activeOrganizationId;

    if (!organizationId) {
      throw new Error('No active organization');
    }

    // Validate file type (accept common image formats for favicons)
    const validImageTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/svg+xml',
    ];
    if (!validImageTypes.includes(fileType)) {
      throw new Error('Only PNG, JPEG, ICO, or SVG files are allowed for favicons');
    }

    // Check S3 client
    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      throw new Error('File upload service is not available');
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Validate file size (1MB limit for favicons)
    const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error('Favicon must be less than 1MB');
    }

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${organizationId}/favicon/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: fileType,
    });
    await s3Client.send(putCommand);

    // Update organization with new favicon key
    await db.organization.update({
      where: { id: organizationId },
      data: { faviconUrl: key },
    });

    // Generate signed URL for immediate display
    const getCommand = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600,
    });

    revalidatePath(`/${organizationId}/settings`);

    return { success: true, faviconUrl: signedUrl };
  });

export const removeOrganizationFaviconAction = authActionClient
  .inputSchema(z.object({}))
  .metadata({
    name: 'remove-organization-favicon',
    track: {
      event: 'remove-organization-favicon',
      channel: 'server',
    },
  })
  .action(async ({ ctx }) => {
    const organizationId = ctx.session.activeOrganizationId;

    if (!organizationId) {
      throw new Error('No active organization');
    }

    // Remove favicon from organization
    await db.organization.update({
      where: { id: organizationId },
      data: { faviconUrl: null },
    });

    revalidatePath(`/${organizationId}/settings`);

    return { success: true };
  });
