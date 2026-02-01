'use server';

import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '@/app/s3';
import { auth } from '@/utils/auth';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const updateFaviconSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64 encoded
});

// PUT /api/organization/[orgId]/favicon - Upload favicon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;

    // Auth check
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of the organization
    const member = await db.member.findFirst({
      where: {
        organizationId: orgId,
        userId: session.user.id,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateFaviconSchema.parse(body);

    // Validate file type (accept common image formats for favicons)
    const validImageTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/svg+xml',
    ];
    if (!validImageTypes.includes(validatedData.fileType)) {
      return NextResponse.json(
        { error: 'Only PNG, JPEG, ICO, or SVG files are allowed for favicons' },
        { status: 400 },
      );
    }

    // Check S3 client
    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      return NextResponse.json({ error: 'File upload service is not available' }, { status: 500 });
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(validatedData.fileData, 'base64');

    // Validate file size (1MB limit for favicons)
    const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Favicon must be less than 1MB' }, { status: 400 });
    }

    // Get current organization to check for existing favicon
    const currentOrg = await db.organization.findUnique({
      where: { id: orgId },
      select: { faviconUrl: true },
    });

    // Delete old favicon from S3 if it exists
    if (currentOrg?.faviconUrl) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Key: currentOrg.faviconUrl,
        });
        await s3Client.send(deleteCommand);
      } catch (error) {
        console.error('Error deleting old favicon from S3:', error);
        // Continue with upload even if deletion fails
      }
    }

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = validatedData.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${orgId}/favicon/${timestamp}-${sanitizedFileName}`;

    // Upload to S3 with public-read ACL so URL doesn't expire
    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: validatedData.fileType,
      ACL: 'public-read', // Make publicly accessible so URL doesn't expire
    });
    await s3Client.send(putCommand);

    // Generate public URL (no expiration)
    const publicUrl = `https://${APP_AWS_ORG_ASSETS_BUCKET}.s3.amazonaws.com/${key}`;

    // Update organization with new favicon URL
    await db.organization.update({
      where: { id: orgId },
      data: { faviconUrl: publicUrl },
    });

    return NextResponse.json({ faviconUrl: publicUrl }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error uploading favicon:', error);
    return NextResponse.json({ error: 'Failed to upload favicon' }, { status: 500 });
  }
}

// DELETE /api/organization/[orgId]/favicon - Remove favicon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;

    // Auth check
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of the organization
    const member = await db.member.findFirst({
      where: {
        organizationId: orgId,
        userId: session.user.id,
        deactivated: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get current organization to check for existing favicon
    const currentOrg = await db.organization.findUnique({
      where: { id: orgId },
      select: { faviconUrl: true },
    });

    // Delete favicon from S3 if it exists
    if (currentOrg?.faviconUrl && s3Client && APP_AWS_ORG_ASSETS_BUCKET) {
      try {
        // Extract the S3 key from the URL
        const url = new URL(currentOrg.faviconUrl);
        const key = url.pathname.substring(1); // Remove leading slash

        const deleteCommand = new DeleteObjectCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Key: key,
        });
        await s3Client.send(deleteCommand);
      } catch (error) {
        console.error('Error deleting favicon from S3:', error);
        // Continue with database update even if S3 deletion fails
      }
    }

    // Remove favicon from organization
    await db.organization.update({
      where: { id: orgId },
      data: { faviconUrl: null },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing favicon:', error);
    return NextResponse.json({ error: 'Failed to remove favicon' }, { status: 500 });
  }
}
