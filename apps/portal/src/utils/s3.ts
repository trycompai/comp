import { SupportedOS } from '@/app/api/download-agent/types';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const APP_AWS_REGION = process.env.APP_AWS_REGION;
const APP_AWS_ACCESS_KEY_ID = process.env.APP_AWS_ACCESS_KEY_ID;
const APP_AWS_SECRET_ACCESS_KEY = process.env.APP_AWS_SECRET_ACCESS_KEY;

export const BUCKET_NAME = process.env.APP_AWS_BUCKET_NAME;

if (!APP_AWS_ACCESS_KEY_ID || !APP_AWS_SECRET_ACCESS_KEY || !BUCKET_NAME || !APP_AWS_REGION) {
  // Log the error in production environments
  if (process.env.NODE_ENV === 'production') {
    console.error('AWS S3 credentials or configuration missing in environment variables.');
  } else {
    // Throw in development for immediate feedback
    throw new Error('AWS S3 credentials or configuration missing. Check environment variables.');
  }
  // Optionally, you could export a dummy/error client or null here
  // depending on how you want consuming code to handle the missing config.
}

// Create a single S3 client instance
// Add null checks or assertions if the checks above don't guarantee non-null values
export const s3Client = new S3Client({
  region: APP_AWS_REGION!,
  credentials: {
    accessKeyId: APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: APP_AWS_SECRET_ACCESS_KEY!,
  },
});

// Ensure BUCKET_NAME is exported and non-null checked if needed elsewhere explicitly
if (!BUCKET_NAME && process.env.NODE_ENV === 'production') {
  console.error('AWS_BUCKET_NAME is not defined.');
}

/**
 * Validates if a hostname is a valid AWS S3 endpoint
 */
function isValidS3Host(host: string): boolean {
  const normalizedHost = host.toLowerCase();

  // Must end with amazonaws.com
  if (!normalizedHost.endsWith('.amazonaws.com')) {
    return false;
  }

  // Check against known S3 patterns
  return /^([\w.-]+\.)?(s3|s3-[\w-]+|s3-website[\w.-]+|s3-accesspoint|s3-control)(\.[\w-]+)?\.amazonaws\.com$/.test(
    normalizedHost,
  );
}

/**
 * Extracts S3 object key from either a full S3 URL or a plain key
 * @throws {Error} If the input is invalid or potentially malicious
 */
export function extractS3KeyFromUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid input: URL must be a non-empty string');
  }

  // Try to parse as URL
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
  } catch {
    // Not a valid URL - will handle as S3 key below
  }

  if (parsedUrl) {
    // Validate it's an S3 URL
    if (!isValidS3Host(parsedUrl.host)) {
      throw new Error('Invalid URL: Not a valid S3 endpoint');
    }

    // Extract and validate the key
    const key = decodeURIComponent(parsedUrl.pathname.substring(1));

    // Security: Check for path traversal
    if (key.includes('../') || key.includes('..\\')) {
      throw new Error('Invalid S3 key: Path traversal detected');
    }

    // Validate key is not empty
    if (!key) {
      throw new Error('Invalid S3 key: Key cannot be empty');
    }

    return key;
  }

  // Not a URL - treat as S3 key
  // Security: Ensure it's not a malformed URL attempting to bypass validation
  const lowerInput = url.toLowerCase();
  if (lowerInput.includes('://') || lowerInput.includes('amazonaws.com')) {
    throw new Error('Invalid input: Malformed URL detected');
  }

  // Security: Check for path traversal
  if (url.includes('../') || url.includes('..\\')) {
    throw new Error('Invalid S3 key: Path traversal detected');
  }

  // Remove leading slash if present
  const key = url.startsWith('/') ? url.substring(1) : url;

  // Validate key is not empty
  if (!key) {
    throw new Error('Invalid S3 key: Key cannot be empty');
  }

  return key;
}

export async function getFleetAgent({ os }: { os: SupportedOS }) {
  const fleetBucketName = process.env.FLEET_AGENT_BUCKET_NAME;

  if (!fleetBucketName) {
    throw new Error('FLEET_AGENT_BUCKET_NAME is not defined.');
  }

  let extension: string;
  switch (os) {
    case 'macos':
      extension = 'pkg';
      break;
    case 'windows':
      extension = 'msi';
      break;
    default:
      throw new Error(`Unsupported OS: ${os}`);
  }

  const macosPackageFilename = 'Comp AI Agent-1.0.0-arm64.dmg';
  const windowsPackageFilename = 'fleet-osquery.msi';

  const getFleetAgentCommand = new GetObjectCommand({
    Bucket: fleetBucketName,
    Key: `${os}/${os === 'macos' ? macosPackageFilename : windowsPackageFilename}`,
  });

  const response = await s3Client.send(getFleetAgentCommand);
  return response.Body;
}

/**
 * Generates a presigned URL for downloading a file from S3
 */
export async function getPresignedDownloadUrl({
  bucketName,
  key,
  expiresIn = 3600, // 1 hour default
}: {
  bucketName: string;
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generates a presigned URL for uploading a file to S3
 */
export async function getPresignedUploadUrl({
  bucketName,
  key,
  contentType,
  expiresIn = 3600, // 1 hour default
}: {
  bucketName: string;
  key: string;
  contentType?: string;
  expiresIn?: number;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}
