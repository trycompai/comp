/**
 * Re-export getSignedUrl with a type workaround for bun's duplicate @smithy/types.
 *
 * Bun on Vercel installs separate @smithy/types copies for @aws-sdk/client-s3
 * and @aws-sdk/s3-request-presigner even when pinned to the same version.
 * This causes a private property 'handlers' type conflict on S3Client.
 * The runtime types are fully compatible — only the TypeScript class identity differs.
 */
import { getSignedUrl as _getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const getSignedUrl = _getSignedUrl as unknown as (
  client: import('@aws-sdk/client-s3').S3Client,
  command: import('@aws-sdk/client-s3').GetObjectCommand | import('@aws-sdk/client-s3').PutObjectCommand,
  options?: { expiresIn?: number },
) => Promise<string>;
