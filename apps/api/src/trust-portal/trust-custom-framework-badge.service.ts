import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '@db';
import { APP_AWS_ORG_ASSETS_BUCKET, getSignedUrl, s3Client } from '../app/s3';
import type { UploadCustomFrameworkBadgeDto } from './dto/trust-custom-framework.dto';

// Badge images are shown on the public Trust Portal, so keep them small and
// non-executable. SVG is intentionally excluded (it can carry inline scripts).
const ALLOWED_BADGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_BADGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_BADGE_BYTES = 256 * 1024; // 256KB
// Matches the favicon public-serve TTL (getFaviconSignedUrl). The public page
// re-fetches per render, so a fresh URL is signed each time.
const BADGE_SIGNED_URL_TTL_SECONDS = 86400; // 24 hours

/**
 * S3 mechanics for custom-framework badge/logo images on the Trust Portal:
 * upload, remove, and signed-URL resolution. Split out of
 * TrustCustomFrameworkService to keep that file focused on portal selection.
 */
@Injectable()
export class TrustCustomFrameworkBadgeService {
  private readonly logger = new Logger(TrustCustomFrameworkBadgeService.name);

  /**
   * Upload (or replace) the badge/logo image for one custom framework. Mirrors
   * the favicon upload flow (base64 -> S3 -> signed URL). Uploading a badge is a
   * presentation-only action: on first write it does NOT publish the framework
   * (create defaults `enabled: false`), so visibility stays controlled solely by
   * the enable toggle.
   */
  async uploadBadge(
    organizationId: string,
    dto: UploadCustomFrameworkBadgeDto,
  ): Promise<{ success: true; badgeUrl: string }> {
    const client = s3Client;
    const bucket = APP_AWS_ORG_ASSETS_BUCKET;
    if (!client || !bucket) {
      throw new ServiceUnavailableException(
        'Organization assets bucket is not configured',
      );
    }

    const { customFrameworkId, fileName, fileType, fileData } = dto;

    // Tenant check: the custom framework must belong to this org. Also satisfies
    // the composite FK (customFrameworkId, organizationId) -> CustomFramework.
    const customFramework = await db.customFramework.findFirst({
      where: { id: customFrameworkId, organizationId },
      select: { id: true },
    });
    if (!customFramework) {
      throw new NotFoundException('Custom framework not found');
    }

    const fileExtension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'));
    if (
      !ALLOWED_BADGE_TYPES.includes(fileType) &&
      !ALLOWED_BADGE_EXTENSIONS.includes(fileExtension)
    ) {
      throw new BadRequestException('Badge must be a PNG, JPEG, or WebP image');
    }

    const fileBuffer = Buffer.from(fileData, 'base64');
    if (fileBuffer.length === 0) {
      throw new BadRequestException('Invalid image data');
    }
    if (fileBuffer.length > MAX_BADGE_BYTES) {
      throw new BadRequestException('Badge must be less than 256KB');
    }

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${organizationId}/trust/custom-framework/${customFrameworkId}/badge/${timestamp}-${sanitizedFileName}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: fileType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    await db.trustCustomFramework.upsert({
      where: {
        organizationId_customFrameworkId: { organizationId, customFrameworkId },
      },
      // Don't publish on first badge upload — visibility is the toggle's job.
      create: {
        organizationId,
        customFrameworkId,
        enabled: false,
        badgeS3Key: key,
      },
      update: { badgeS3Key: key },
    });

    const signedUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: BADGE_SIGNED_URL_TTL_SECONDS },
    );

    this.logger.log(
      `Uploaded trust portal badge for custom framework ${customFrameworkId} (org ${organizationId})`,
    );

    return { success: true, badgeUrl: signedUrl };
  }

  /**
   * Remove a custom framework's badge. Clears the stored key only (the S3 object
   * is left in place, matching removeFavicon); the portal falls back to the
   * initials avatar.
   */
  async removeBadge(
    organizationId: string,
    customFrameworkId: string,
  ): Promise<{ success: true }> {
    const selection = await db.trustCustomFramework.findUnique({
      where: {
        organizationId_customFrameworkId: { organizationId, customFrameworkId },
      },
      select: { customFrameworkId: true },
    });
    if (!selection) {
      throw new NotFoundException('Custom framework selection not found');
    }

    await db.trustCustomFramework.update({
      where: {
        organizationId_customFrameworkId: { organizationId, customFrameworkId },
      },
      data: { badgeS3Key: null },
    });

    return { success: true };
  }

  /**
   * Resolve a stored badge S3 key to a temporary signed URL. Returns null on any
   * failure (or when S3 isn't configured) so read paths degrade gracefully to
   * the initials avatar — mirrors getFaviconSignedUrl.
   */
  async signBadgeUrl(badgeS3Key: string): Promise<string | null> {
    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      return null;
    }
    try {
      return await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Key: badgeS3Key,
        }),
        { expiresIn: BADGE_SIGNED_URL_TTL_SECONDS },
      );
    } catch {
      return null;
    }
  }
}
