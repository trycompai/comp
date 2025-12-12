import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import '../config/load-env';

const logger = new Logger('S3');

const APP_AWS_REGION = process.env.APP_AWS_REGION;
const APP_AWS_ACCESS_KEY_ID = process.env.APP_AWS_ACCESS_KEY_ID;
const APP_AWS_SECRET_ACCESS_KEY = process.env.APP_AWS_SECRET_ACCESS_KEY;

export const BUCKET_NAME = process.env.APP_AWS_BUCKET_NAME;
export const APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET =
  process.env.APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET;
export const APP_AWS_KNOWLEDGE_BASE_BUCKET =
  process.env.APP_AWS_KNOWLEDGE_BASE_BUCKET;
export const APP_AWS_ORG_ASSETS_BUCKET = process.env.APP_AWS_ORG_ASSETS_BUCKET;

let s3ClientInstance: S3Client | null = null;

try {
  if (
    !APP_AWS_ACCESS_KEY_ID ||
    !APP_AWS_SECRET_ACCESS_KEY ||
    !BUCKET_NAME ||
    !APP_AWS_REGION
  ) {
    logger.error(
      '[S3] AWS S3 credentials or configuration missing. Check environment variables.',
    );
    throw new Error(
      'AWS S3 credentials or configuration missing. Check environment variables.',
    );
  }

  s3ClientInstance = new S3Client({
    region: APP_AWS_REGION,
    credentials: {
      accessKeyId: APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: APP_AWS_SECRET_ACCESS_KEY,
    },
  });
} catch (error) {
  logger.error(
    'FAILED TO INITIALIZE S3 CLIENT',
    error instanceof Error ? error.stack : error,
  );
  s3ClientInstance = null;
  logger.error(
    '[S3] Creating dummy S3 client - file uploads will fail until credentials are fixed',
  );
}

export const s3Client = s3ClientInstance;

function isValidS3Host(host: string): boolean {
  const normalizedHost = host.toLowerCase();

  if (!normalizedHost.endsWith('.amazonaws.com')) {
    return false;
  }

  return /^([\w.-]+\.)?(s3|s3-[\w-]+|s3-website[\w.-]+|s3-accesspoint|s3-control)(\.[\w-]+)?\.amazonaws\.com$/.test(
    normalizedHost,
  );
}

export function extractS3KeyFromUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid input: URL must be a non-empty string');
  }

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    // not a URL, continue
  }

  if (parsedUrl) {
    if (!isValidS3Host(parsedUrl.host)) {
      throw new Error('Invalid URL: Not a valid S3 endpoint');
    }

    const key = decodeURIComponent(parsedUrl.pathname.substring(1));

    if (key.includes('../') || key.includes('..\\')) {
      throw new Error('Invalid S3 key: Path traversal detected');
    }

    if (!key) {
      throw new Error('Invalid S3 key: Key cannot be empty');
    }

    return key;
  }

  // Reject inputs that look like URLs or domains but weren't parsed as valid S3 URLs above
  // This catches malformed URLs and prevents URL injection attacks
  const lowerInput = url.toLowerCase();
  if (lowerInput.includes('://')) {
    throw new Error('Invalid input: Malformed URL detected');
  }

  // Check for domain-like patterns (e.g., "example.com", "sub.example.com")
  // S3 keys should not contain domain patterns
  const domainPattern =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}(\/|$)/i;
  if (domainPattern.test(url)) {
    throw new Error('Invalid input: Domain-like pattern detected in S3 key');
  }

  if (url.includes('../') || url.includes('..\\')) {
    throw new Error('Invalid S3 key: Path traversal detected');
  }

  const key = url.startsWith('/') ? url.substring(1) : url;

  if (!key) {
    throw new Error('Invalid S3 key: Key cannot be empty');
  }

  return key;
}

export async function getFleetAgent({
  os,
}: {
  os: 'macos' | 'windows' | 'linux';
}) {
  if (!s3Client) {
    throw new Error('S3 client not configured');
  }

  const fleetBucketName = process.env.FLEET_AGENT_BUCKET_NAME;
  const fleetAgentFileName = 'Comp AI Agent-1.0.0-arm64.dmg';

  if (!fleetBucketName) {
    throw new Error('FLEET_AGENT_BUCKET_NAME is not defined.');
  }

  const getFleetAgentCommand = new GetObjectCommand({
    Bucket: fleetBucketName,
    Key: `${os}/${fleetAgentFileName}`,
  });

  const response = await s3Client.send(getFleetAgentCommand);
  return response.Body;
}
