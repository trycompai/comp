import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@trycompai/db';
import { s3Client, BUCKET_NAME } from '@/app/s3';
import type { UpsertOrgChartDto } from './dto/upsert-org-chart.dto';
import type { UploadOrgChartDto } from './dto/upload-org-chart.dto';

@Injectable()
export class OrgChartService {
  private readonly logger = new Logger(OrgChartService.name);
  private s3Client: S3Client | null;
  private bucketName: string | undefined;
  private readonly SIGNED_URL_EXPIRY = 900; // 15 minutes
  private readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_IMAGE_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ];

  constructor() {
    this.s3Client = s3Client ?? null;
    this.bucketName = BUCKET_NAME;
  }

  async findByOrganization(organizationId: string) {
    try {
      const chart = await db.organizationChart.findUnique({
        where: { organizationId },
      });

      if (!chart) {
        return null;
      }

      // If there's an uploaded image, generate a presigned URL
      let signedImageUrl: string | null = null;
      if (chart.type === 'uploaded' && chart.uploadedImageUrl) {
        signedImageUrl = await this.getSignedUrl(chart.uploadedImageUrl);
      }

      return {
        ...chart,
        signedImageUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch org chart for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch org chart');
    }
  }

  async upsertInteractive(
    organizationId: string,
    data: UpsertOrgChartDto,
  ) {
    try {
      this.logger.log(
        `[OrgChart API] Saving for org ${organizationId}: nodes=${data.nodes?.length ?? 'null'}, edges=${data.edges?.length ?? 'null'}`,
      );

      // If switching from uploaded → interactive, clean up the orphaned S3 object
      const existing = await db.organizationChart.findUnique({
        where: { organizationId },
      });
      if (existing?.uploadedImageUrl) {
        await this.deleteS3Object(existing.uploadedImageUrl);
      }

      const chart = await db.organizationChart.upsert({
        where: { organizationId },
        create: {
          organizationId,
          type: 'interactive',
          nodes: data.nodes as any,
          edges: data.edges as any,
          ...(data.name && { name: data.name }),
        },
        update: {
          type: 'interactive',
          nodes: data.nodes as any,
          edges: data.edges as any,
          uploadedImageUrl: null,
          ...(data.name && { name: data.name }),
        },
      });

      this.logger.log(
        `Upserted interactive org chart for organization ${organizationId}`,
      );
      return chart;
    } catch (error) {
      this.logger.error(
        `Failed to upsert org chart for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to save org chart');
    }
  }

  async uploadImage(
    organizationId: string,
    data: UploadOrgChartDto,
  ) {
    if (!this.s3Client || !this.bucketName) {
      throw new InternalServerErrorException(
        'File upload service is not available',
      );
    }

    try {
      // Validate MIME type is an allowed image type
      const normalizedType = data.fileType.toLowerCase();
      if (!this.ALLOWED_IMAGE_MIME_TYPES.includes(normalizedType)) {
        throw new BadRequestException(
          `File type '${data.fileType}' is not allowed. Only image files are accepted.`,
        );
      }

      const fileBuffer = Buffer.from(data.fileData, 'base64');

      if (fileBuffer.length > this.MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          'File exceeds the 100MB size limit',
        );
      }

      // Delete old image if it exists
      const existing = await db.organizationChart.findUnique({
        where: { organizationId },
      });
      if (existing?.uploadedImageUrl) {
        await this.deleteS3Object(existing.uploadedImageUrl);
      }

      const timestamp = Date.now();
      const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `${organizationId}/org-chart/${timestamp}-${sanitizedFileName}`;

      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: data.fileType,
      });
      await this.s3Client.send(putCommand);

      const chart = await db.organizationChart.upsert({
        where: { organizationId },
        create: {
          organizationId,
          type: 'uploaded',
          uploadedImageUrl: s3Key,
        },
        update: {
          type: 'uploaded',
          uploadedImageUrl: s3Key,
          nodes: [],
          edges: [],
        },
      });

      const signedImageUrl = await this.getSignedUrl(s3Key);

      this.logger.log(
        `Uploaded org chart image for organization ${organizationId}`,
      );

      return {
        ...chart,
        signedImageUrl,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to upload org chart image for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to upload org chart image',
      );
    }
  }

  async delete(organizationId: string) {
    try {
      const existing = await db.organizationChart.findUnique({
        where: { organizationId },
      });

      if (!existing) {
        return { message: 'No org chart found' };
      }

      // Delete S3 image if applicable
      if (existing.uploadedImageUrl) {
        await this.deleteS3Object(existing.uploadedImageUrl);
      }

      await db.organizationChart.delete({
        where: { organizationId },
      });

      this.logger.log(
        `Deleted org chart for organization ${organizationId}`,
      );

      return { message: 'Org chart deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to delete org chart for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to delete org chart');
    }
  }

  private async getSignedUrl(s3Key: string): Promise<string | null> {
    if (!this.s3Client || !this.bucketName) {
      return null;
    }

    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      return await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: this.SIGNED_URL_EXPIRY,
      });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${s3Key}:`, error);
      return null;
    }
  }

  private async deleteS3Object(s3Key: string): Promise<void> {
    if (!this.s3Client || !this.bucketName) {
      return;
    }

    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      await this.s3Client.send(deleteCommand);
    } catch (error) {
      this.logger.error(`Failed to delete S3 object ${s3Key}:`, error);
    }
  }
}
