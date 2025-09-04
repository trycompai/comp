import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable, PassThrough } from 'stream';
import archiver from 'archiver';
import { generateWindowsScript } from './scripts/windows';
import { getPackageFilename, getReadmeContent, getScriptFilename } from './scripts/common';

@Injectable()
export class DeviceAgentService {
  private readonly logger = new Logger(DeviceAgentService.name);
  private s3Client: S3Client;
  private fleetBucketName: string;

  constructor() {
    // AWS configuration is validated at startup via ConfigModule
    // For device agents, we use the FLEET_AGENT_BUCKET_NAME if available,
    // otherwise fall back to the main bucket
    this.fleetBucketName = process.env.FLEET_AGENT_BUCKET_NAME || process.env.APP_AWS_BUCKET_NAME!;
    this.s3Client = new S3Client({
      region: process.env.APP_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async downloadMacAgent(): Promise<{ stream: Readable; filename: string; contentType: string }> {
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

      this.logger.log(`Successfully retrieved macOS agent: ${macosPackageFilename}`);

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

  async downloadWindowsAgent(organizationId: string, employeeId: string): Promise<{ stream: Readable; filename: string; contentType: string }> {
    try {
      this.logger.log(`Creating Windows agent zip for org ${organizationId}, employee ${employeeId}`);

      // Hardcoded device marker paths used by the setup scripts
      const fleetDevicePathWindows = 'C:\\ProgramData\\CompAI\\Fleet';
      
      // Generate the Windows setup script
      const script = generateWindowsScript({
        orgId: organizationId,
        employeeId: employeeId,
        fleetDevicePath: fleetDevicePathWindows,
      });

      // Create a passthrough stream for the response
      const passThrough = new PassThrough();
      const archive = archiver('zip', { zlib: { level: 9 } });

      // Pipe archive to passthrough
      archive.pipe(passThrough);

      // Error handling for the archive
      archive.on('error', (err) => {
        this.logger.error('Archive error:', err);
        passThrough.destroy(err);
      });

      archive.on('warning', (warn) => {
        this.logger.warn('Archive warning:', warn);
      });

      // Add script file
      const scriptFilename = getScriptFilename('windows');
      archive.append(script, { name: scriptFilename, mode: 0o755 });

      // Add README
      const readmeContent = getReadmeContent('windows');
      archive.append(readmeContent, { name: 'README.txt' });

      // Get MSI package from S3 and stream it into the zip
      const windowsPackageFilename = 'fleet-osquery.msi';
      const packageKey = `windows/${windowsPackageFilename}`;
      const packageFilename = getPackageFilename('windows');

      this.logger.log(`Downloading Windows MSI from S3: ${packageKey}`);

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.fleetBucketName,
        Key: packageKey,
      });

      const s3Response = await this.s3Client.send(getObjectCommand);

      if (s3Response.Body) {
        const s3Stream = s3Response.Body as Readable;
        s3Stream.on('error', (err) => {
          this.logger.error('S3 stream error:', err);
          passThrough.destroy(err);
        });
        archive.append(s3Stream, { name: packageFilename, store: true });
      } else {
        this.logger.warn('Windows MSI file not found in S3, creating zip without MSI');
      }

      // Finalize the archive
      archive.finalize();

      this.logger.log('Successfully created Windows agent zip');

      return {
        stream: passThrough,
        filename: `compai-device-agent-windows.zip`,
        contentType: 'application/zip',
      };
    } catch (error) {
      this.logger.error('Failed to create Windows agent zip:', error);
      throw error;
    }
  }
}
