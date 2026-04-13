import { Prisma, TrustFramework } from '@db';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
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
import * as dns from 'node:dns';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client, getSignedUrl } from '../app/s3';
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
  private readonly vercelBaseUrl = 'https://api.vercel.com';
  private readonly vercelToken: string;
  private readonly MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
  private readonly SIGNED_URL_EXPIRY_SECONDS = 900;

  constructor() {
    this.vercelToken = process.env.VERCEL_ACCESS_TOKEN || '';
    if (!this.vercelToken) {
      this.logger.warn('VERCEL_ACCESS_TOKEN is not set');
    }
  }

  private async vercelFetch<T = unknown>({
    method,
    path,
    params,
    body,
  }: {
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    params?: Record<string, string>;
    body?: unknown;
  }): Promise<{ data: T; status: number }> {
    const url = new URL(path, this.vercelBaseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const resp = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!resp.ok) {
      const errorBody = await resp.json().catch(() => ({}));
      const err = new Error(
        errorBody?.error?.message || `Vercel API ${method} ${path} failed (${resp.status})`,
      ) as Error & { status: number; responseData: unknown };
      err.status = resp.status;
      err.responseData = errorBody;
      throw err;
    }
    const data = (await resp.json()) as T;
    return { data, status: resp.status };
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
      const teamId = process.env.VERCEL_TEAM_ID!;
      const [domainResponse, configResponse] = await Promise.all([
        this.vercelFetch<VercelDomainResponse>({
          method: 'GET',
          path: `/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${TrustPortalService.safeDomainPath(domain)}`,
          params: { teamId },
        }),
        // Get domain config to retrieve the actual CNAME target
        this.vercelFetch<VercelDomainConfigResponse>({
          method: 'GET',
          path: `/v6/domains/${TrustPortalService.safeDomainPath(domain)}/config`,
          params: { teamId },
        }).catch((err) => {
          this.logger.warn(
            `Failed to get domain config for ${domain}: ${err instanceof Error ? err.message : err}`,
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

      if (error instanceof Error && 'status' in error) {
        const statusCode = (error as Error & { status: number }).status;
        this.logger.error(`Vercel API error (${statusCode}): ${error.message}`);
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

    const data: Record<string, unknown> = {};

    // Map framework boolean fields (frontend sends camelCase, DB uses snake_case)
    const boolFieldMap: Record<string, string> = {
      soc2: 'soc2',
      soc2type1: 'soc2type1',
      soc2type2: 'soc2type2',
      iso27001: 'iso27001',
      iso42001: 'iso42001',
      gdpr: 'gdpr',
      hipaa: 'hipaa',
      pcidss: 'pci_dss',
      pci_dss: 'pci_dss',
      nen7510: 'nen7510',
      iso9001: 'iso9001',
    };

    // Map framework status fields (frontend sends camelCase like "iso27001Status", DB uses "iso27001_status")
    const statusFieldMap: Record<string, string> = {
      soc2type1Status: 'soc2type1_status',
      soc2type2Status: 'soc2type2_status',
      iso27001Status: 'iso27001_status',
      iso42001Status: 'iso42001_status',
      gdprStatus: 'gdpr_status',
      hipaaStatus: 'hipaa_status',
      pcidssStatus: 'pci_dss_status',
      nen7510Status: 'nen7510_status',
      iso9001Status: 'iso9001_status',
      // Also support snake_case input (from other callers)
      soc2type1_status: 'soc2type1_status',
      soc2type2_status: 'soc2type2_status',
      iso27001_status: 'iso27001_status',
      iso42001_status: 'iso42001_status',
      gdpr_status: 'gdpr_status',
      hipaa_status: 'hipaa_status',
      pci_dss_status: 'pci_dss_status',
      nen7510_status: 'nen7510_status',
      iso9001_status: 'iso9001_status',
    };

    for (const [inputKey, dbField] of Object.entries(boolFieldMap)) {
      if (frameworks[inputKey] !== undefined) {
        data[dbField] = frameworks[inputKey];
      }
    }
    for (const [inputKey, dbField] of Object.entries(statusFieldMap)) {
      if (frameworks[inputKey] !== undefined) {
        data[dbField] = frameworks[inputKey];
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
    this.validateDomain(domain);

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

      // Remove old domain from Vercel if switching to a different one
      if (currentTrust?.domain && currentTrust.domain !== domain) {
        try {
          await this.vercelFetch({
            method: 'DELETE',
            path: `/v9/projects/${projectId}/domains/${TrustPortalService.safeDomainPath(currentTrust.domain)}`,
            params: { teamId },
          });
        } catch (error) {
          this.logger.warn(
            `Failed to remove old domain ${currentTrust.domain} from Vercel: ${error}`,
          );
        }
      }

      // Check if domain already exists on the Vercel project
      const existingDomainsResp = await this.vercelFetch<{
        domains: Array<{ name: string }>;
      }>({
        method: 'GET',
        path: `/v9/projects/${projectId}/domains`,
        params: { teamId },
      });

      const existingDomains = existingDomainsResp.data?.domains ?? [];

      const alreadyOnProject = existingDomains.some((d) => d.name === domain);

      if (alreadyOnProject) {
        const domainOwner = await db.trust.findFirst({
          where: { domain, organizationId: { not: organizationId } },
          select: { organizationId: true },
        });

        if (domainOwner) {
          return {
            success: false,
            error: 'Domain is already in use by another organization',
          };
        }

        // Domain already on Vercel for this org — fetch current status
        // instead of deleting and re-adding (which regenerates verification tokens)
        const statusResp = await this.vercelFetch<VercelDomainResponse>({
          method: 'GET',
          path: `/v9/projects/${projectId}/domains/${TrustPortalService.safeDomainPath(domain)}`,
          params: { teamId },
        });

        const statusData = statusResp.data;
        const isVercelDomain = statusData.verified === false;
        const vercelVerification =
          statusData.verification?.[0]?.value || null;

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
      }

      this.logger.log(`Adding domain to Vercel project: ${domain}`);

      const addResp = await this.vercelFetch<VercelDomainResponse>({
        method: 'POST',
        path: `/v9/projects/${projectId}/domains`,
        params: { teamId },
        body: { name: domain },
      });

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
      const vercelError = error as Error & { status?: number; responseData?: { error?: { code?: string; projectId?: string; message?: string; domain?: VercelDomainResponse } } };
      if (vercelError.status === 409) {
        const errorData = vercelError.responseData?.error;

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
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update custom domain';

      this.logger.error(`Custom domain error for ${domain}:`, error);
      throw new BadRequestException(errorMessage);
    }
  }

  /** Validate domain to prevent path injection in API URLs */
  private static readonly VALID_DOMAIN_PATTERN = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  private validateDomain(domain: string): void {
    if (!TrustPortalService.VALID_DOMAIN_PATTERN.test(domain)) {
      throw new BadRequestException('Invalid domain format');
    }
  }

  /** Encode a validated domain for safe use in URL path segments. */
  private static safeDomainPath(domain: string): string {
    return encodeURIComponent(domain);
  }

  /**
   * DNS CNAME patterns for Vercel verification.
   */
  private static readonly VERCEL_DNS_CNAME_PATTERN =
    /\.vercel-dns(-\d+)?\.com\.?$/i;
  private static readonly VERCEL_DNS_FALLBACK_PATTERN =
    /vercel-dns[^.]*\.com\.?$/i;

  async checkDnsRecords(organizationId: string, domain: string) {
    this.validateDomain(domain);

    // Verify the domain belongs to this organization
    const trustRecord = await db.trust.findUnique({
      where: { organizationId },
    });
    if (!trustRecord || trustRecord.domain !== domain) {
      throw new BadRequestException(
        'Domain does not match the configured domain for this organization',
      );
    }

    const rootDomain = domain.split('.').slice(-2).join('.');

    const dnsPromises = dns.promises;
    const resolveCname = (host: string): Promise<string[]> =>
      dnsPromises.resolve(host, 'CNAME').catch(() => []);
    const resolveTxt = (host: string): Promise<string[][]> =>
      dnsPromises.resolve(host, 'TXT').catch(() => []);

    const [cnameRecords, txtRecords, vercelTxtRecords] = await Promise.all([
      resolveCname(domain),
      resolveTxt(rootDomain),
      resolveTxt(`_vercel.${rootDomain}`),
    ]);

    // Fetch fresh verification state from Vercel instead of relying on
    // potentially stale DB values (tokens change if domain was re-added).
    let liveIsVercelDomain = false;
    let liveVercelVerification: string | null = null;

    if (process.env.TRUST_PORTAL_PROJECT_ID && process.env.VERCEL_TEAM_ID) {
      try {
        const vercelStatusResp = await this.vercelFetch<VercelDomainResponse>({
          method: 'GET',
          path: `/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${TrustPortalService.safeDomainPath(domain)}`,
          params: { teamId: process.env.VERCEL_TEAM_ID },
        });
        const vercelData = vercelStatusResp.data;
        liveIsVercelDomain = vercelData.verified === false;
        liveVercelVerification =
          vercelData.verification?.[0]?.value || null;

        // Sync DB with live Vercel state
        await db.trust.update({
          where: { organizationId },
          data: {
            isVercelDomain: liveIsVercelDomain,
            vercelVerification: liveVercelVerification,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to fetch live Vercel status for ${domain}, falling back to DB: ${error}`,
        );
        const trustRecord = await db.trust.findUnique({
          where: { organizationId, domain },
          select: { isVercelDomain: true, vercelVerification: true },
        });
        liveIsVercelDomain = trustRecord?.isVercelDomain === true;
        liveVercelVerification = trustRecord?.vercelVerification ?? null;
      }
    }

    const expectedTxtValue = `compai-domain-verification=${organizationId}`;
    const expectedVercelTxtValue = liveVercelVerification;

    // Node's resolve(host, 'TXT') returns string[][] — each inner array is one TXT record
    const txtRecordMatches = (records: string[][], expected: string | null) =>
      expected != null &&
      records.some((segments) => segments.some((s) => s === expected));

    // Check CNAME — Node DNS resolve returns string[] of CNAME targets
    let isCnameVerified = cnameRecords.some((address) =>
      TrustPortalService.VERCEL_DNS_CNAME_PATTERN.test(address),
    );
    if (!isCnameVerified) {
      const fallback = cnameRecords.find((address) =>
        TrustPortalService.VERCEL_DNS_FALLBACK_PATTERN.test(address),
      );
      if (fallback) {
        this.logger.warn(`CNAME matched fallback pattern: ${fallback}`);
        isCnameVerified = true;
      }
    }

    // Check TXT
    const isTxtVerified = txtRecordMatches(txtRecords, expectedTxtValue);

    // Check Vercel TXT
    const isVercelTxtVerified = txtRecordMatches(
      vercelTxtRecords,
      expectedVercelTxtValue,
    );

    const requiresVercelTxt = liveIsVercelDomain;
    const isVerified =
      isCnameVerified &&
      isTxtVerified &&
      (!requiresVercelTxt || isVercelTxtVerified);

    if (!isVerified) {
      return {
        success: false,
        isCnameVerified,
        isTxtVerified,
        isVercelTxtVerified,
        error:
          'Some DNS records are not configured correctly. Please check the records marked as unverified above and try again.',
      };
    }

    // Trigger Vercel to re-verify the domain so it provisions SSL and starts serving.
    let vercelVerified = false;
    if (process.env.TRUST_PORTAL_PROJECT_ID && process.env.VERCEL_TEAM_ID) {
      try {
        const verifyResp = await this.vercelFetch<{ verified: boolean }>({
          method: 'POST',
          path: `/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${TrustPortalService.safeDomainPath(domain)}/verify`,
          params: { teamId: process.env.VERCEL_TEAM_ID },
          body: {},
        });
        vercelVerified = verifyResp.data?.verified === true;
      } catch (error) {
        this.logger.warn(
          `Failed to trigger Vercel domain verification for ${domain}: ${error}`,
        );
      }
    }

    // For cross-account domains (liveIsVercelDomain=true), Vercel must confirm
    // the _vercel TXT record before the domain will serve traffic.
    // For same-account domains, DNS verification is sufficient — Vercel will
    // pick up the CNAME on its own, so don't block on the verify response.
    const domainFullyVerified = requiresVercelTxt
      ? vercelVerified
      : true;

    await db.trust.update({
      where: { organizationId },
      data: {
        domainVerified: domainFullyVerified,
        ...(domainFullyVerified ? { status: 'published' as const } : {}),
      },
    });

    if (!domainFullyVerified) {
      return {
        success: false,
        isCnameVerified,
        isTxtVerified,
        isVercelTxtVerified,
        error:
          'DNS records verified but Vercel has not yet confirmed domain ownership. Please ensure the _vercel TXT record is correctly configured and try again.',
      };
    }

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

  async updateOverview(
    organizationId: string,
    data: {
      overviewTitle?: string | null;
      overviewContent?: string | null;
      showOverview?: boolean;
    },
  ) {
    const trust = await db.trust.findUnique({
      where: { organizationId },
    });

    if (!trust) {
      throw new NotFoundException('Trust portal not found');
    }

    return db.trust.update({
      where: { organizationId },
      data: {
        overviewTitle: data.overviewTitle,
        overviewContent: data.overviewContent,
        showOverview: data.showOverview,
      },
    });
  }

  async getOverview(organizationId: string) {
    const trust = await db.trust.findUnique({
      where: { organizationId },
      select: {
        overviewTitle: true,
        overviewContent: true,
        showOverview: true,
      },
    });

    if (!trust) {
      throw new NotFoundException('Trust portal not found');
    }

    return trust;
  }

  async createCustomLink(
    organizationId: string,
    data: {
      title: string;
      description?: string | null;
      url: string;
    },
  ) {
    const maxOrder = await db.trustCustomLink.findFirst({
      where: { organizationId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = (maxOrder?.order ?? -1) + 1;

    return db.trustCustomLink.create({
      data: {
        organizationId,
        title: data.title,
        description: data.description,
        url: data.url,
        order,
      },
    });
  }

  async updateCustomLink(
    linkId: string,
    data: {
      title?: string;
      description?: string | null;
      url?: string;
      isActive?: boolean;
    },
    organizationId: string,
  ) {
    const link = await db.trustCustomLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Custom link not found');
    }

    if (link.organizationId !== organizationId) {
      throw new BadRequestException(
        'You can only modify custom links belonging to your organization',
      );
    }

    return db.trustCustomLink.update({
      where: { id: linkId },
      data,
    });
  }

  async deleteCustomLink(linkId: string, organizationId: string) {
    const link = await db.trustCustomLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      throw new NotFoundException('Custom link not found');
    }

    if (link.organizationId !== organizationId) {
      throw new BadRequestException(
        'You can only delete custom links belonging to your organization',
      );
    }

    await db.trustCustomLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  }

  async reorderCustomLinks(organizationId: string, linkIds: string[]) {
    const links = await db.trustCustomLink.findMany({
      where: { organizationId },
    });

    const linkIdSet = new Set(links.map((l) => l.id));
    const invalidIds = linkIds.filter((id) => !linkIdSet.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Some link IDs do not belong to this organization',
      );
    }

    await db.$transaction(
      linkIds.map((linkId, index) =>
        db.trustCustomLink.update({
          where: { id: linkId },
          data: { order: index },
        }),
      ),
    );

    return { success: true };
  }

  async listCustomLinks(organizationId: string) {
    return db.trustCustomLink.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get complete trust portal settings for the admin page.
   * Ensures trust record exists, returns all config fields, favicon URL, org data.
   */
  async getSettings(organizationId: string) {
    // Ensure trust record exists with a friendlyUrl
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, primaryColor: true, trustPortalFaqs: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    await this.ensureFriendlyUrl(organizationId, org.name);

    const trust = await db.trust.findUnique({
      where: { organizationId },
    });

    if (!trust) {
      throw new NotFoundException('Trust portal not found');
    }

    // Get favicon signed URL if available
    let faviconUrl: string | null = null;
    if (trust.favicon && s3Client && APP_AWS_ORG_ASSETS_BUCKET) {
      try {
        const command = new GetObjectCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Key: trust.favicon,
        });
        faviconUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch {
        // If favicon fetch fails, continue without it
      }
    }

    // Fetch default overview content from Context Hub if overview is empty
    let defaultOverviewContent: string | null = null;
    if (!trust.overviewContent) {
      const missionContext = await db.context.findFirst({
        where: { organizationId, question: 'Mission & Vision' },
        select: { answer: true },
      });
      defaultOverviewContent = missionContext?.answer ?? null;
    }

    return {
      enabled: trust.status === 'published',
      friendlyUrl: trust.friendlyUrl,
      domain: trust.domain ?? '',
      domainVerified: trust.domainVerified ?? false,
      isVercelDomain: trust.isVercelDomain ?? false,
      vercelVerification: trust.vercelVerification ?? null,
      contactEmail: trust.contactEmail ?? null,
      allowedDomains: trust.allowedDomains ?? [],
      // Framework flags
      soc2type1: trust.soc2type1 ?? false,
      soc2type2: trust.soc2type2 || trust.soc2 || false,
      iso27001: trust.iso27001 ?? false,
      iso42001: trust.iso42001 ?? false,
      gdpr: trust.gdpr ?? false,
      hipaa: trust.hipaa ?? false,
      pcidss: trust.pci_dss ?? false,
      nen7510: trust.nen7510 ?? false,
      iso9001: trust.iso9001 ?? false,
      // Framework statuses
      soc2type1Status: trust.soc2type1_status ?? 'started',
      soc2type2Status:
        !trust.soc2type2 && trust.soc2
          ? trust.soc2_status ?? 'started'
          : trust.soc2type2_status ?? 'started',
      iso27001Status: trust.iso27001_status ?? 'started',
      iso42001Status: trust.iso42001_status ?? 'started',
      gdprStatus: trust.gdpr_status ?? 'started',
      hipaaStatus: trust.hipaa_status ?? 'started',
      pcidssStatus: trust.pci_dss_status ?? 'started',
      nen7510Status: trust.nen7510_status ?? 'started',
      iso9001Status: trust.iso9001_status ?? 'started',
      // Overview
      overviewTitle: trust.overviewTitle ?? null,
      overviewContent: trust.overviewContent ?? defaultOverviewContent,
      showOverview: trust.showOverview ?? false,
      // Favicon
      faviconUrl,
      // Organization data
      primaryColor: org.primaryColor ?? null,
      faqs: org.trustPortalFaqs ?? null,
    };
  }

  /**
   * Upload a favicon for the trust portal.
   */
  async uploadFavicon(
    organizationId: string,
    dto: { fileName: string; fileType: string; fileData: string },
  ) {
    this.ensureS3Availability();

    const { fileName, fileType, fileData } = dto;

    // Validate file type
    const allowedTypes = [
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/png',
      'image/svg+xml',
    ];
    const allowedExtensions = ['.ico', '.png', '.svg'];
    const fileExtension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'));

    if (
      !allowedTypes.includes(fileType) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      throw new BadRequestException(
        'Favicon must be .ico, .png, or .svg format',
      );
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Validate file size (100KB limit)
    if (fileBuffer.length > 100 * 1024) {
      throw new BadRequestException('Favicon must be less than 100KB');
    }

    // Generate S3 key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${organizationId}/trust/favicon/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: fileType,
      CacheControl: 'public, max-age=31536000, immutable',
    });
    await s3Client!.send(putCommand);

    // Update trust record
    const trust = await db.trust.findUnique({
      where: { organizationId },
    });

    if (!trust) {
      throw new NotFoundException('Trust portal not found');
    }

    await db.trust.update({
      where: { organizationId },
      data: { favicon: key },
    });

    // Generate signed URL for immediate display
    const getCommand = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client!, getCommand, {
      expiresIn: 3600,
    });

    return { success: true, faviconUrl: signedUrl };
  }

  /**
   * Remove the trust portal favicon.
   */
  async removeFavicon(organizationId: string) {
    await db.trust.update({
      where: { organizationId },
      data: { favicon: null },
    });

    return { success: true };
  }

  /**
   * Get all vendors with sync from GlobalVendors risk assessment data.
   * Extracts compliance badges and generates logo URLs.
   */
  async getAllVendorsWithSync(organizationId: string) {
    const vendors = await db.vendor.findMany({
      where: { organizationId },
      orderBy: [{ trustPortalOrder: 'asc' }, { name: 'asc' }],
    });

    // Sync compliance badges and logos in parallel
    const syncedVendors = await Promise.all(
      vendors.map(async (vendor) => {
        const updates: Prisma.VendorUpdateInput = {};
        let hasUpdates = false;

        // Look up GlobalVendors record by website
        if (vendor.website) {
          const globalVendor = await db.globalVendors.findUnique({
            where: { website: vendor.website },
            select: { riskAssessmentData: true },
          });

          if (globalVendor?.riskAssessmentData) {
            const extractedBadges = this.extractComplianceBadges(
              globalVendor.riskAssessmentData,
            );
            if (extractedBadges && extractedBadges.length > 0) {
              const currentBadges = vendor.complianceBadges as
                | Array<{ type: string }>
                | null;
              const currentTypes = new Set(
                currentBadges?.map((b) => b.type) ?? [],
              );
              const extractedTypes = new Set(
                extractedBadges.map((b) => b.type),
              );

              const isDifferent =
                currentTypes.size !== extractedTypes.size ||
                [...extractedTypes].some((t) => !currentTypes.has(t));

              if (isDifferent) {
                updates.complianceBadges =
                  extractedBadges as unknown as Prisma.InputJsonValue;
                hasUpdates = true;
              }
            }
          }
        }

        // Generate logo URL if missing
        if (!vendor.logoUrl && vendor.website) {
          const logoUrl = this.generateLogoUrl(vendor.website);
          if (logoUrl) {
            updates.logoUrl = logoUrl;
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          const updated = await db.vendor.update({
            where: { id: vendor.id },
            data: updates,
          });
          return updated;
        }

        return vendor;
      }),
    );

    return syncedVendors.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      website: v.website,
      showOnTrustPortal: v.showOnTrustPortal,
      logoUrl: v.logoUrl,
      complianceBadges: v.complianceBadges,
    }));
  }

  private extractComplianceBadges(
    data: Prisma.JsonValue,
  ): Array<{ type: string; verified: boolean }> | null {
    try {
      const parsed = data as {
        certifications?: Array<{ type: string; status: string }>;
      };

      if (!parsed?.certifications || !Array.isArray(parsed.certifications)) {
        return null;
      }

      const badges: Array<{ type: string; verified: boolean }> = [];
      const seenTypes = new Set<string>();

      for (const cert of parsed.certifications) {
        if (cert.status !== 'verified') continue;

        const badgeType = this.mapCertificationToBadgeType(cert.type);
        if (badgeType && !seenTypes.has(badgeType)) {
          seenTypes.add(badgeType);
          badges.push({ type: badgeType, verified: true });
        }
      }

      return badges.length > 0 ? badges : null;
    } catch {
      return null;
    }
  }

  private mapCertificationToBadgeType(certType: string): string | null {
    const normalized = certType.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normalized.includes('soc2') || normalized.includes('soc 2'))
      return 'soc2';
    if (normalized.includes('iso27001') || normalized.includes('iso 27001'))
      return 'iso27001';
    if (normalized.includes('iso42001') || normalized.includes('iso 42001'))
      return 'iso42001';
    if (normalized.includes('gdpr')) return 'gdpr';
    if (normalized.includes('hipaa')) return 'hipaa';
    if (
      normalized.includes('pcidss') ||
      normalized.includes('pci dss') ||
      normalized.includes('pci_dss')
    )
      return 'pci_dss';
    if (normalized.includes('nen7510') || normalized.includes('nen 7510'))
      return 'nen7510';
    if (normalized.includes('iso9001') || normalized.includes('iso 9001'))
      return 'iso9001';

    return null;
  }

  private generateLogoUrl(website: string | null): string | null {
    if (!website) return null;
    try {
      const urlWithProtocol = website.startsWith('http')
        ? website
        : `https://${website}`;
      const parsed = new URL(urlWithProtocol);
      const domain = parsed.hostname.replace(/^www\./, '');
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch {
      return null;
    }
  }

  async getPublicVendors(organizationId: string) {
    return db.vendor.findMany({
      where: {
        organizationId,
        isSubProcessor: true,
        showOnTrustPortal: true,
      },
      orderBy: [{ trustPortalOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        logoUrl: true,
        complianceBadges: true,
      },
    });
  }

  async updateVendorTrustSettings(
    vendorId: string,
    data: {
      logoUrl?: string | null;
      showOnTrustPortal?: boolean;
      trustPortalOrder?: number | null;
      complianceBadges?: any;
    },
    organizationId: string,
  ) {
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    if (vendor.organizationId !== organizationId) {
      throw new BadRequestException(
        'You can only modify vendors belonging to your organization',
      );
    }

    return db.vendor.update({
      where: { id: vendorId },
      data: {
        logoUrl: data.logoUrl,
        showOnTrustPortal: data.showOnTrustPortal,
        trustPortalOrder: data.trustPortalOrder,
        complianceBadges: data.complianceBadges as Prisma.InputJsonValue,
      },
    });
  }
}
