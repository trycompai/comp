import { Prisma, TrustFramework } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '@db';
import {
  DomainStatusResponseDto,
  DomainVerificationDto,
  GetDomainStatusDto,
} from './dto/domain-status.dto';
import {
  ComplianceResourceResponseDto,
  ComplianceResourceSignedUrlDto,
  ComplianceResourceUrlResponseDto,
  UploadComplianceResourceDto,
} from './dto/compliance-resource.dto';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '../app/s3';

interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: VercelDomainVerification[];
}

@Injectable()
export class TrustPortalService {
  private readonly logger = new Logger(TrustPortalService.name);
  private readonly vercelApi: AxiosInstance;
  private readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  private readonly SIGNED_URL_EXPIRY_SECONDS = 900;

  constructor() {
    const bearerToken = process.env.VERCEL_ACCESS_TOKEN;

    if (!bearerToken) {
      this.logger.warn('VERCEL_ACCESS_TOKEN is not set');
    }

    // Initialize axios instance for Vercel API
    this.vercelApi = axios.create({
      baseURL: 'https://api.vercel.com',
      headers: {
        Authorization: `Bearer ${bearerToken || ''}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private static readonly FRAMEWORK_CONFIG: Record<
    TrustFramework,
    {
      statusField:
        | 'iso27001_status'
        | 'iso42001_status'
        | 'gdpr_status'
        | 'hipaa_status'
        | 'soc2type1_status'
        | 'soc2type2_status'
        | 'pci_dss_status'
        | 'nen7510_status'
        | 'iso9001_status';
      enabledField:
        | 'iso27001'
        | 'iso42001'
        | 'gdpr'
        | 'hipaa'
        | 'soc2type1'
        | 'soc2type2'
        | 'pci_dss'
        | 'nen7510'
        | 'iso9001';
      slug: string;
    }
  > = {
    [TrustFramework.iso_27001]: {
      statusField: 'iso27001_status',
      enabledField: 'iso27001',
      slug: 'iso_27001',
    },
    [TrustFramework.iso_42001]: {
      statusField: 'iso42001_status',
      enabledField: 'iso42001',
      slug: 'iso_42001',
    },
    [TrustFramework.gdpr]: {
      statusField: 'gdpr_status',
      enabledField: 'gdpr',
      slug: 'gdpr',
    },
    [TrustFramework.hipaa]: {
      statusField: 'hipaa_status',
      enabledField: 'hipaa',
      slug: 'hipaa',
    },
    [TrustFramework.soc2_type1]: {
      statusField: 'soc2type1_status',
      enabledField: 'soc2type1',
      slug: 'soc2_type1',
    },
    [TrustFramework.soc2_type2]: {
      statusField: 'soc2type2_status',
      enabledField: 'soc2type2',
      slug: 'soc2_type2',
    },
    [TrustFramework.pci_dss]: {
      statusField: 'pci_dss_status',
      enabledField: 'pci_dss',
      slug: 'pci_dss',
    },
    [TrustFramework.nen_7510]: {
      statusField: 'nen7510_status',
      enabledField: 'nen7510',
      slug: 'nen_7510',
    },
    [TrustFramework.iso_9001]: {
      statusField: 'iso9001_status',
      enabledField: 'iso9001',
      slug: 'iso_9001',
    },
  };

  async getDomainStatus(
    dto: GetDomainStatusDto,
  ): Promise<DomainStatusResponseDto> {
    const { domain } = dto;

    if (!process.env.TRUST_PORTAL_PROJECT_ID) {
      throw new InternalServerErrorException(
        'TRUST_PORTAL_PROJECT_ID is not configured',
      );
    }

    if (!process.env.VERCEL_TEAM_ID) {
      throw new InternalServerErrorException(
        'VERCEL_TEAM_ID is not configured',
      );
    }

    if (!domain) {
      throw new BadRequestException('Domain is required');
    }

    try {
      this.logger.log(`Fetching domain status for: ${domain}`);

      // Get domain information including verification status
      // Vercel API endpoint: GET /v9/projects/{projectId}/domains/{domain}
      const response = await this.vercelApi.get<VercelDomainResponse>(
        `/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${domain}`,
        {
          params: {
            teamId: process.env.VERCEL_TEAM_ID,
          },
        },
      );

      const domainInfo = response.data;

      const verification: DomainVerificationDto[] | undefined =
        domainInfo.verification?.map((v) => ({
          type: v.type,
          domain: v.domain,
          value: v.value,
          reason: v.reason,
        }));

      return {
        domain: domainInfo.name,
        verified: domainInfo.verified ?? false,
        verification,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get domain status for ${domain}:`,
        error instanceof Error ? error.stack : error,
      );

      // Handle axios errors with more detail
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        this.logger.error(`Vercel API error (${statusCode}): ${message}`);
      }

      throw new InternalServerErrorException(
        'Failed to get domain status from Vercel',
      );
    }
  }

  async uploadComplianceResource(
    dto: UploadComplianceResourceDto,
  ): Promise<ComplianceResourceResponseDto> {
    this.ensureS3Availability();
    await this.assertFrameworkIsCompliant(dto.organizationId, dto.framework);

    const { fileBuffer, sanitizedFileName } = this.preparePdfPayload(dto);
    const slug = TrustPortalService.FRAMEWORK_CONFIG[dto.framework].slug;
    const timestamp = Date.now();
    const s3Prefix = `${dto.organizationId}/resources/${slug}`;
    const s3Key = `${s3Prefix}/${timestamp}-${sanitizedFileName}`;

    const existingResource = await db.trustResource.findUnique({
      where: {
        organizationId_framework: {
          organizationId: dto.organizationId,
          framework: dto.framework,
        },
      },
    });

    if (existingResource) {
      await this.safeDeleteObject(existingResource.s3Key);
    }

    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        organizationId: dto.organizationId,
        framework: slug,
        originalFileName: dto.fileName,
      },
    });

    await s3Client!.send(putCommand);

    const record = await db.trustResource.upsert({
      where: {
        organizationId_framework: {
          organizationId: dto.organizationId,
          framework: dto.framework,
        },
      },
      update: {
        s3Key,
        fileName: dto.fileName,
        fileSize: fileBuffer.length,
      },
      create: {
        organizationId: dto.organizationId,
        framework: dto.framework,
        s3Key,
        fileName: dto.fileName,
        fileSize: fileBuffer.length,
      },
    });

    return {
      framework: record.framework,
      fileName: record.fileName,
      fileSize: record.fileSize,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async listComplianceResources(
    organizationId: string,
  ): Promise<ComplianceResourceResponseDto[]> {
    const records = await db.trustResource.findMany({
      where: {
        organizationId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return records.map((record) => ({
      framework: record.framework,
      fileName: record.fileName,
      fileSize: record.fileSize,
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  async getComplianceResourceUrl(
    dto: ComplianceResourceSignedUrlDto,
  ): Promise<ComplianceResourceUrlResponseDto> {
    this.ensureS3Availability();

    const record = await db.trustResource.findUnique({
      where: {
        organizationId_framework: {
          organizationId: dto.organizationId,
          framework: dto.framework,
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `No certificate uploaded for framework ${dto.framework}`,
      );
    }

    const getCommand = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: record.s3Key,
    });

    const signedUrl = await getSignedUrl(s3Client!, getCommand, {
      expiresIn: this.SIGNED_URL_EXPIRY_SECONDS,
    });

    return {
      signedUrl,
      fileName: record.fileName,
      fileSize: record.fileSize,
    };
  }

  private async assertFrameworkIsCompliant(
    organizationId: string,
    framework: TrustFramework,
  ): Promise<void> {
    const config = TrustPortalService.FRAMEWORK_CONFIG[framework];
    const trustRecord = await db.trust.findUnique({
      where: { organizationId },
    });

    if (!trustRecord) {
      throw new BadRequestException(
        'Trust portal configuration not found for organization',
      );
    }

    if (trustRecord[config.statusField] !== 'compliant') {
      throw new BadRequestException(
        `Framework ${framework} must be marked as compliant before uploading a certificate`,
      );
    }

    // Auto-enable the framework if it's not already enabled (for backward compatibility with old organizations)
    if (!trustRecord[config.enabledField]) {
      await db.trust.update({
        where: { organizationId },
        data: {
          [config.enabledField]: true,
        },
      });
      this.logger.log(
        `Auto-enabled framework ${framework} for organization ${organizationId} during certificate upload`,
      );
    }
  }

  private preparePdfPayload(dto: UploadComplianceResourceDto) {
    if (
      dto.fileType.toLowerCase() !== 'application/pdf' &&
      !dto.fileName.toLowerCase().endsWith('.pdf')
    ) {
      throw new BadRequestException('Only PDF files are supported');
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(dto.fileData, 'base64');
    } catch {
      throw new BadRequestException(
        'Invalid file data. Expected base64 string.',
      );
    }

    if (!fileBuffer.length) {
      throw new BadRequestException('File cannot be empty');
    }

    if (fileBuffer.length > this.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      );
    }

    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');

    return { fileBuffer, sanitizedFileName };
  }

  private ensureS3Availability(): void {
    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      throw new InternalServerErrorException(
        'Organization assets bucket is not configured',
      );
    }
  }

  private async safeDeleteObject(key: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: key,
      });
      await s3Client!.send(deleteCommand);
    } catch (error) {
      this.logger.warn(
        `Failed to delete previous compliance resource with key ${key}`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
