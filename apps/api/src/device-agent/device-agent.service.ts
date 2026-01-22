import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class DeviceAgentService {
  private readonly logger = new Logger(DeviceAgentService.name);
  private s3Client: S3Client;
  private fleetBucketName: string;

  constructor() {
    // AWS configuration is validated at startup via ConfigModule
    // For device agents, we use the FLEET_AGENT_BUCKET_NAME if available,
    // otherwise fall back to the main bucket
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
      throw error;
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
      throw error;
    }
  }
}
