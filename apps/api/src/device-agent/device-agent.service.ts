import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const S3_ENV = process.env.DEVICE_AGENT_S3_ENV || 'production';
const S3_UPDATES_PREFIX = `device-agent/${S3_ENV}/updates`;

const ALLOWED_EXTENSIONS = new Set([
  '.yml',
  '.zip',
  '.exe',
  '.blockmap',
  '.AppImage',
  '.dmg',
]);

const CONTENT_TYPES: Record<string, string> = {
  '.yml': 'text/yaml',
  '.zip': 'application/zip',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
  '.AppImage': 'application/octet-stream',
  '.dmg': 'application/x-apple-diskimage',
};

function getExtension(filename: string): string {
  if (filename.endsWith('.AppImage')) return '.AppImage';
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex) : '';
}

function isValidFilename(filename: string): boolean {
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return false;
  }
  return ALLOWED_EXTENSIONS.has(getExtension(filename));
}

@Injectable()
export class DeviceAgentService {
  private readonly logger = new Logger(DeviceAgentService.name);
  private s3Client: S3Client;
  private fleetBucketName: string;

  constructor() {
    this.fleetBucketName =
      process.env.FLEET_AGENT_BUCKET_NAME || process.env.APP_AWS_BUCKET_NAME!;
    this.s3Client = new S3Client({
      region: process.env.APP_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async downloadMacAgent(): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
  }> {
    try {
      const macosPackageFilename = 'Comp AI Agent-1.0.0-arm64.dmg';
      const packageKey = `macos/${macosPackageFilename}`;

      this.logger.log(`Downloading macOS agent from S3: ${packageKey}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.fleetBucketName,
        Key: packageKey,
      });

      const s3Response = await this.s3Client.send(getObjectCommand);

      if (!s3Response.Body) {
        throw new NotFoundException('macOS agent DMG file not found in S3');
      }

      // Use S3 stream directly as Node.js Readable
      const s3Stream = s3Response.Body as Readable;

      this.logger.log(
        `Successfully retrieved macOS agent: ${macosPackageFilename}`,
      );

      return {
        stream: s3Stream,
        filename: macosPackageFilename,
        contentType: 'application/x-apple-diskimage',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to download macOS agent from S3:', error);
      const s3Error = error as { name?: string };
      if (s3Error.name === 'NoSuchKey' || s3Error.name === 'NotFound') {
        throw new NotFoundException('macOS agent file not found');
      }
      throw new InternalServerErrorException(
        'Failed to download macOS agent. The agent file may not be available in this environment.',
      );
    }
  }

  async downloadWindowsAgent(): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
  }> {
    try {
      const windowsPackageFilename = 'Comp AI Agent 1.0.0.exe';
      const packageKey = `windows/${windowsPackageFilename}`;

      this.logger.log(`Downloading Windows agent from S3: ${packageKey}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.fleetBucketName,
        Key: packageKey,
      });

      const s3Response = await this.s3Client.send(getObjectCommand);

      if (!s3Response.Body) {
        throw new NotFoundException(
          'Windows agent executable file not found in S3',
        );
      }

      // Use S3 stream directly as Node.js Readable
      const s3Stream = s3Response.Body as Readable;

      this.logger.log(
        `Successfully retrieved Windows agent: ${windowsPackageFilename}`,
      );

      return {
        stream: s3Stream,
        filename: windowsPackageFilename,
        contentType: 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to download Windows agent from S3:', error);
      const s3Error = error as { name?: string };
      if (s3Error.name === 'NoSuchKey' || s3Error.name === 'NotFound') {
        throw new NotFoundException('Windows agent file not found');
      }
      throw new InternalServerErrorException(
        'Failed to download Windows agent. The agent file may not be available in this environment.',
      );
    }
  }

  async getUpdateFile({ filename }: { filename: string }): Promise<{
    stream: Readable;
    contentType: string;
    contentLength?: number;
  }> {
    if (!isValidFilename(filename)) {
      throw new NotFoundException('Not found');
    }

    const key = `${S3_UPDATES_PREFIX}/${filename}`;
    const ext = getExtension(filename);
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    try {
      const command = new GetObjectCommand({
        Bucket: this.fleetBucketName,
        Key: key,
      });
      const s3Response = await this.s3Client.send(command);

      if (!s3Response.Body) {
        throw new NotFoundException('Not found');
      }

      return {
        stream: s3Response.Body as Readable,
        contentType,
        contentLength:
          typeof s3Response.ContentLength === 'number'
            ? s3Response.ContentLength
            : undefined,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      const s3Error = error as { name?: string };
      if (s3Error.name === 'NoSuchKey') {
        throw new NotFoundException('Not found');
      }
      this.logger.error('Error serving update file:', { key, error });
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async headUpdateFile({
    filename,
  }: {
    filename: string;
  }): Promise<{ contentType: string; contentLength?: number }> {
    if (!isValidFilename(filename)) {
      throw new NotFoundException('Not found');
    }

    const key = `${S3_UPDATES_PREFIX}/${filename}`;
    const ext = getExtension(filename);
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    try {
      const command = new HeadObjectCommand({
        Bucket: this.fleetBucketName,
        Key: key,
      });
      const s3Response = await this.s3Client.send(command);

      return {
        contentType,
        contentLength:
          typeof s3Response.ContentLength === 'number'
            ? s3Response.ContentLength
            : undefined,
      };
    } catch {
      throw new NotFoundException('Not found');
    }
  }
}
