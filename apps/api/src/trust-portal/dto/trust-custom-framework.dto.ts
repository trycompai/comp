import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { z } from 'zod';

/**
 * Update the public Trust Portal selection for a single org-authored custom
 * framework. Mirrors the enabled + status that native frameworks store as
 * columns on `Trust`. At least one of `enabled` / `status` must be provided.
 */
export const UpdateTrustCustomFrameworkSchema = z
  .object({
    customFrameworkId: z.string().min(1),
    enabled: z.boolean().optional(),
    status: z.enum(['started', 'in_progress', 'compliant']).optional(),
  })
  .refine((data) => data.enabled !== undefined || data.status !== undefined, {
    message: 'At least one of `enabled` or `status` must be provided',
  });

export type UpdateTrustCustomFrameworkDto = z.infer<
  typeof UpdateTrustCustomFrameworkSchema
>;

/** A custom framework plus its Trust Portal selection state (admin view). */
export interface TrustCustomFrameworkAdminItem {
  customFrameworkId: string;
  name: string;
  description: string;
  /** Whether the framework is shown on the public portal. */
  enabled: boolean;
  /** Displayed status; defaults to 'started' when never configured. */
  status: 'started' | 'in_progress' | 'compliant';
  /** Whether a compliance certificate PDF has been uploaded. */
  hasCertificate: boolean;
  certificateFileName: string | null;
  /** Signed URL to the uploaded badge/logo, or null when none is set. */
  badgeUrl: string | null;
}

/** A custom framework as shown on the public portal. */
export interface TrustCustomFrameworkPublicItem {
  id: string;
  name: string;
  description: string;
  status: 'started' | 'in_progress' | 'compliant';
  hasCertificate: boolean;
  /** Signed URL to the uploaded badge/logo, or null when none is set. */
  badgeUrl: string | null;
}

/** Upload (or replace) the badge/logo image for one custom framework. */
export class UploadCustomFrameworkBadgeDto {
  @ApiProperty({
    description: 'Org-authored custom framework ID the badge belongs to',
    example: 'cfrm_6914cd0e16e4c7dccbb54426',
  })
  @IsString()
  @IsNotEmpty()
  customFrameworkId!: string;

  @ApiProperty({
    description: 'Original file name (PNG, JPEG, or WebP)',
    example: 'acme-framework-badge.png',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    description: 'MIME type of the image',
    example: 'image/png',
  })
  @IsString()
  @IsNotEmpty()
  fileType!: string;

  @ApiProperty({
    description:
      'Base64 encoded image content (PNG/JPEG/WebP, max 256KB decoded)',
  })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  // ~256KB once base64-decoded; rejects oversized/malformed payloads at the
  // request boundary. The service enforces the exact decoded-byte cap.
  @MaxLength(350_000)
  fileData!: string;
}

/** Query params for removing a custom framework's badge. */
export class RemoveCustomFrameworkBadgeQueryDto {
  @ApiProperty({
    description: 'Org-authored custom framework ID whose badge to remove',
    example: 'cfrm_6914cd0e16e4c7dccbb54426',
  })
  @IsString()
  @IsNotEmpty()
  customFrameworkId!: string;
}

/** Response from a successful badge upload. */
export class CustomFrameworkBadgeResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({
    description: 'Signed URL to the uploaded badge for immediate display',
  })
  badgeUrl!: string;
}
