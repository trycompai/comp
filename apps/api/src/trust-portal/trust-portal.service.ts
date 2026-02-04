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
import {
  DeleteTrustDocumentDto,
  TrustDocumentResponseDto,
  TrustDocumentSignedUrlDto,
  TrustDocumentUrlResponseDto,
  UploadTrustDocumentDto,
} from './dto/trust-document.dto';

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

interface VercelRecommendedCNAME {
  rank: number;
  value: string;
}

interface VercelDomainConfigResponse {
  configuredBy?: 'CNAME' | 'A' | 'http' | 'dns-01' | null;
  misconfigured: boolean;
  recommendedCNAME?: VercelRecommendedCNAME[];
}

@Injectable()
export class TrustPortalService {
  private readonly logger = new Logger(TrustPortalService.name);
  private readonly vercelApi: AxiosInstance;
  private readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
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
      const [domainResponse, configResponse] = await Promise.all([
        this.vercelApi.get<VercelDomainResponse>(
          `/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${domain}`,
          {
            params: {
              teamId: process.env.VERCEL_TEAM_ID,
            },
          },
        ),
        // Get domain config to retrieve the actual CNAME target
        // Vercel API endpoint: GET /v6/domains/{domain}/config
        this.vercelApi
          .get<VercelDomainConfigResponse>(`/v6/domains/${domain}/config`, {
            params: {
              teamId: process.env.VERCEL_TEAM_ID,
            },
          })
          .catch((err) => {
            this.logger.warn(
              `Failed to get domain config for ${domain}: ${err.message}`,
            );
            return null;
          }),
      ]);

      const domainInfo = domainResponse.data;
      const configInfo = configResponse?.data;

      const verification: DomainVerificationDto[] | undefined =
        domainInfo.verification?.map((v) => ({
          type: v.type,
          domain: v.domain,
          value: v.value,
          reason: v.reason,
        }));

      // Extract the CNAME target from the config response
      // Prefer rank=1 (preferred value), fallback to first available
      const recommendedCNAMEs = configInfo?.recommendedCNAME;
      const cnameTarget =
        recommendedCNAMEs?.find((c) => c.rank === 1)?.value ||
        recommendedCNAMEs?.[0]?.value;

      return {
        domain: domainInfo.name,
        verified: domainInfo.verified ?? false,
        verification,
        cnameTarget,
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

  async listTrustDocuments(
    organizationId: string,
  ): Promise<TrustDocumentResponseDto[]> {
    const records = await db.trustDocument.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return records.map((record) => ({
      id: record.id,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    }));
  }

  async uploadTrustDocument(
    dto: UploadTrustDocumentDto,
  ): Promise<TrustDocumentResponseDto> {
    this.ensureS3Availability();

    const { fileBuffer, sanitizedFileName } = this.prepareGenericFilePayload({
      fileData: dto.fileData,
      fileName: dto.fileName,
    });

    const timestamp = Date.now();
    const s3Prefix = `${dto.organizationId}/trust-documents`;
    const s3Key = `${s3Prefix}/${timestamp}-${sanitizedFileName}`;

    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: dto.fileType || 'application/octet-stream',
      Metadata: {
        organizationId: dto.organizationId,
        originalFileName: dto.fileName,
      },
    });

    await s3Client!.send(putCommand);

    const record = await db.trustDocument.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.fileName,
        description: dto.description || null,
        s3Key,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: record.id,
      name: record.name,
      description: record.description,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async getTrustDocumentUrl(
    documentId: string,
    dto: TrustDocumentSignedUrlDto,
  ): Promise<TrustDocumentUrlResponseDto> {
    this.ensureS3Availability();

    const record = await db.trustDocument.findUnique({
      where: {
        id: documentId,
        organizationId: dto.organizationId,
      },
      select: {
        s3Key: true,
        name: true,
        isActive: true,
      },
    });

    if (!record || !record.isActive) {
      throw new NotFoundException('Document not found');
    }

    const getCommand = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: record.s3Key,
      ResponseContentDisposition: `attachment; filename="${record.name.replaceAll('"', '')}"`,
    });

    const signedUrl = await getSignedUrl(s3Client!, getCommand, {
      expiresIn: this.SIGNED_URL_EXPIRY_SECONDS,
    });

    return {
      signedUrl,
      fileName: record.name,
    };
  }

  async deleteTrustDocument(
    documentId: string,
    dto: DeleteTrustDocumentDto,
  ): Promise<{ success: boolean }> {
    const record = await db.trustDocument.findUnique({
      where: {
        id: documentId,
        organizationId: dto.organizationId,
      },
      select: {
        id: true,
        s3Key: true,
        isActive: true,
      },
    });

    if (!record || !record.isActive) {
      throw new NotFoundException('Document not found');
    }

    await db.trustDocument.update({
      where: { id: record.id },
      data: { isActive: false },
    });

    // Best-effort cleanup: if S3 deletion fails, the document is already hidden from users
    await this.safeDeleteObject(record.s3Key);

    return { success: true };
  }

  async updateFaqs(
    organizationId: string,
    faqs: Array<{ question: string; answer: string }>,
  ) {
    // Normalize order values
    const normalizedFaqs =
      faqs.length > 0
        ? faqs.map((faq, index) => ({
            question: faq.question,
            answer: faq.answer,
            order: index,
          }))
        : null;

    await db.organization.update({
      where: { id: organizationId },
      data: { trustPortalFaqs: normalizedFaqs as any },
    });

    return { success: true };
  }

  async updateAllowedDomains(organizationId: string, domains: string[]) {
    const normalizedDomains = [
      ...new Set(domains.map((d) => d.toLowerCase().trim())),
    ];

    await db.trust.upsert({
      where: { organizationId },
      update: { allowedDomains: normalizedDomains },
      create: { organizationId, allowedDomains: normalizedDomains },
    });

    return { success: true };
  }

  async updateFrameworks(
    organizationId: string,
    frameworks: Record<string, boolean | string | undefined>,
  ) {
    const trust = await db.trust.findUnique({
      where: { organizationId },
    });

    if (!trust) {
      throw new NotFoundException('Trust portal not found for organization');
    }

    const data: Record<string, any> = {};

    // Map framework fields
    const boolFields = [
      'soc2type1',
      'soc2type2',
      'iso27001',
      'iso42001',
      'gdpr',
      'hipaa',
      'pci_dss',
      'nen7510',
      'iso9001',
    ] as const;
    const statusFields = [
      'soc2type1_status',
      'soc2type2_status',
      'iso27001_status',
      'iso42001_status',
      'gdpr_status',
      'hipaa_status',
      'pci_dss_status',
      'nen7510_status',
      'iso9001_status',
    ] as const;

    for (const field of boolFields) {
      if (frameworks[field] !== undefined) {
        data[field] = frameworks[field];
      }
    }
    for (const field of statusFields) {
      if (frameworks[field] !== undefined) {
        data[field] = frameworks[field];
      }
    }

    await db.trust.update({
      where: { organizationId },
      data,
    });

    return { success: true };
  }

  async togglePortal(
    organizationId: string,
    enabled: boolean,
    contactEmail?: string,
    primaryColor?: string,
  ) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Ensure friendlyUrl exists when enabling the portal
    if (enabled) {
      await this.ensureFriendlyUrl(organizationId, org.name);
    }

    await db.trust.upsert({
      where: { organizationId },
      update: {
        status: enabled ? 'published' : 'draft',
        contactEmail: contactEmail === '' ? null : (contactEmail ?? undefined),
      },
      create: {
        organizationId,
        status: enabled ? 'published' : 'draft',
        contactEmail: contactEmail === '' ? null : (contactEmail ?? undefined),
      },
    });

    if (primaryColor !== undefined) {
      await db.organization.update({
        where: { id: organizationId },
        data: { primaryColor: primaryColor === '' ? null : primaryColor },
      });
    }

    return { success: true };
  }

  private slugifyOrganizationName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  private async ensureFriendlyUrl(
    organizationId: string,
    organizationName: string,
  ): Promise<string> {
    const current = await db.trust.findUnique({
      where: { organizationId },
      select: { friendlyUrl: true },
    });

    if (current?.friendlyUrl) return current.friendlyUrl;

    const baseCandidate =
      this.slugifyOrganizationName(organizationName) ||
      `org-${organizationId.slice(-8)}`;

    for (let i = 0; i < 50; i += 1) {
      const candidate = i === 0 ? baseCandidate : `${baseCandidate}-${i + 1}`;

      const taken = await db.trust.findUnique({
        where: { friendlyUrl: candidate },
        select: { organizationId: true },
      });

      if (taken && taken.organizationId !== organizationId) continue;

      try {
        await db.trust.upsert({
          where: { organizationId },
          update: { friendlyUrl: candidate },
          create: { organizationId, friendlyUrl: candidate },
        });
        return candidate;
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }

    return organizationId;
  }

  async addCustomDomain(organizationId: string, domain: string) {
    if (!process.env.TRUST_PORTAL_PROJECT_ID || !process.env.VERCEL_TEAM_ID) {
      throw new InternalServerErrorException(
        'Vercel project configuration is missing',
      );
    }

    const projectId = process.env.TRUST_PORTAL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    try {
      const currentTrust = await db.trust.findUnique({
        where: { organizationId },
      });

      const domainVerified =
        currentTrust?.domain === domain
          ? currentTrust.domainVerified
          : false;

      // Check if domain already exists on the Vercel project
      const existingDomainsResp = await this.vercelApi.get(
        `/v9/projects/${projectId}/domains`,
        { params: { teamId } },
      );

      const existingDomains: Array<{ name: string }> =
        existingDomainsResp.data?.domains ?? [];

      if (existingDomains.some((d) => d.name === domain)) {
        const domainOwner = await db.trust.findUnique({
          where: { organizationId, domain },
        });

        if (!domainOwner || domainOwner.organizationId === organizationId) {
          await this.vercelApi.delete(
            `/v9/projects/${projectId}/domains/${domain}`,
            { params: { teamId } },
          );
        } else {
          return {
            success: false,
            error: 'Domain is already in use by another organization',
          };
        }
      }

      this.logger.log(`Adding domain to Vercel project: ${domain}`);

      const addResp = await this.vercelApi.post(
        `/v9/projects/${projectId}/domains`,
        { name: domain },
        { params: { teamId } },
      );

      const addData = addResp.data;
      const isVercelDomain = addData.verified === false;
      const vercelVerification =
        addData.verification?.[0]?.value || null;

      await db.trust.upsert({
        where: { organizationId },
        update: {
          domain,
          domainVerified,
          isVercelDomain,
          vercelVerification,
        },
        create: {
          organizationId,
          domain,
          domainVerified: false,
          isVercelDomain,
          vercelVerification,
        },
      });

      return {
        success: true,
        needsVerification: !domainVerified,
      };
    } catch (error) {
      // Handle Vercel 409 conflict — domain already exists on the project
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const errorData = error.response.data?.error;

        if (
          errorData?.code === 'domain_already_in_use' &&
          errorData?.projectId === projectId
        ) {
          const existingOwner = await db.trust.findFirst({
            where: {
              domain,
              organizationId: { not: organizationId },
            },
            select: { organizationId: true },
          });

          if (existingOwner) {
            return {
              success: false,
              error: 'Domain is already in use by another organization',
            };
          }

          const domainInfo = errorData.domain;
          const vercelVerification =
            domainInfo?.verification?.[0]?.value || null;
          const isVercelDomain = domainInfo?.verified !== true;

          await db.trust.upsert({
            where: { organizationId },
            update: {
              domain,
              domainVerified: false,
              isVercelDomain,
              vercelVerification,
            },
            create: {
              organizationId,
              domain,
              domainVerified: false,
              isVercelDomain,
              vercelVerification,
            },
          });

          return {
            success: true,
            needsVerification: true,
          };
        }
      }

      // Extract meaningful error message
      let errorMessage = 'Failed to update custom domain';
      if (axios.isAxiosError(error)) {
        errorMessage =
          error.response?.data?.error?.message ||
          error.message ||
          errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }

      this.logger.error(`Custom domain error for ${domain}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * DNS CNAME patterns for Vercel verification.
   */
  private static readonly VERCEL_DNS_CNAME_PATTERN =
    /\.vercel-dns(-\d+)?\.com\.?$/i;
  private static readonly VERCEL_DNS_FALLBACK_PATTERN =
    /vercel-dns[^.]*\.com\.?$/i;

  async checkDnsRecords(organizationId: string, domain: string) {
    const rootDomain = domain.split('.').slice(-2).join('.');

    const [cnameResp, txtResp, vercelTxtResp] = await Promise.all([
      axios
        .get(`https://networkcalc.com/api/dns/lookup/${domain}`)
        .catch(() => null),
      axios
        .get(
          `https://networkcalc.com/api/dns/lookup/${rootDomain}?type=TXT`,
        )
        .catch(() => null),
      axios
        .get(
          `https://networkcalc.com/api/dns/lookup/_vercel.${rootDomain}?type=TXT`,
        )
        .catch(() => null),
    ]);

    if (
      !cnameResp ||
      cnameResp.status !== 200 ||
      cnameResp.data?.status !== 'OK' ||
      !txtResp ||
      txtResp.status !== 200 ||
      txtResp.data?.status !== 'OK'
    ) {
      throw new BadRequestException(
        'DNS record verification failed, check the records are valid or try again later.',
      );
    }

    const cnameRecords = cnameResp.data?.records?.CNAME;
    const txtRecords = txtResp.data?.records?.TXT;
    const vercelTxtRecords = vercelTxtResp?.data?.records?.TXT;

    const trustRecord = await db.trust.findUnique({
      where: { organizationId, domain },
      select: { isVercelDomain: true, vercelVerification: true },
    });

    const expectedTxtValue = `compai-domain-verification=${organizationId}`;
    const expectedVercelTxtValue = trustRecord?.vercelVerification;

    // Check CNAME
    let isCnameVerified = false;
    if (cnameRecords) {
      isCnameVerified = cnameRecords.some(
        (r: { address: string }) =>
          TrustPortalService.VERCEL_DNS_CNAME_PATTERN.test(r.address),
      );
      if (!isCnameVerified) {
        const fallback = cnameRecords.find(
          (r: { address: string }) =>
            TrustPortalService.VERCEL_DNS_FALLBACK_PATTERN.test(r.address),
        );
        if (fallback) {
          this.logger.warn(
            `CNAME matched fallback pattern: ${fallback.address}`,
          );
          isCnameVerified = true;
        }
      }
    }

    // Check TXT
    let isTxtVerified = false;
    if (txtRecords) {
      isTxtVerified = txtRecords.some((record: any) => {
        if (typeof record === 'string') return record === expectedTxtValue;
        if (record?.value) return record.value === expectedTxtValue;
        if (Array.isArray(record?.txt))
          return record.txt.some((t: string) => t === expectedTxtValue);
        return false;
      });
    }

    // Check Vercel TXT
    let isVercelTxtVerified = false;
    if (vercelTxtRecords) {
      isVercelTxtVerified = vercelTxtRecords.some((record: any) => {
        if (typeof record === 'string')
          return record === expectedVercelTxtValue;
        if (record?.value) return record.value === expectedVercelTxtValue;
        if (Array.isArray(record?.txt))
          return record.txt.some(
            (t: string) => t === expectedVercelTxtValue,
          );
        return false;
      });
    }

    const isVerified =
      isCnameVerified && isTxtVerified && isVercelTxtVerified;

    if (!isVerified) {
      return {
        success: false,
        isCnameVerified,
        isTxtVerified,
        isVercelTxtVerified,
        error:
          'Error verifying DNS records. Please ensure both CNAME and TXT records are correctly configured, or wait a few minutes and try again.',
      };
    }

    await db.trust.upsert({
      where: { organizationId, domain },
      update: { domainVerified: true, status: 'published' },
      create: {
        organizationId,
        domain,
        status: 'published',
      },
    });

    return {
      success: true,
      isCnameVerified,
      isTxtVerified,
      isVercelTxtVerified,
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

  private prepareGenericFilePayload({
    fileData,
    fileName,
  }: {
    fileData: string;
    fileName: string;
  }) {
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(fileData, 'base64');
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

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
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
