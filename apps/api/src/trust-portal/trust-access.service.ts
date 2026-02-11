import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { db, Prisma, TrustFramework } from '@db/server';
import { randomBytes } from 'crypto';
import {
  ApproveAccessRequestDto,
  CreateAccessRequestDto,
  DenyAccessRequestDto,
  ListAccessRequestsDto,
  RevokeGrantDto,
} from './dto/trust-access.dto';
import { TrustEmailService } from './email.service';
import { NdaPdfService } from './nda-pdf.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from './policy-pdf-renderer.service';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '../app/s3';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';


@Injectable()
export class TrustAccessService {
  /**
   * Convert hex color to RGB values (0-1 range for pdf-lib)
   * @param hex - Hex color string (e.g., "#3B82F6" or "3B82F6")
   * @returns RGB object with r, g, b values between 0 and 1
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    return { r, g, b };
  }

  /**
   * Get accent color from organization or use default
   */
  private getAccentColor(primaryColor: string | null | undefined): {
    r: number;
    g: number;
    b: number;
  } {
    // Default project primary color: dark teal/green (hsl(165, 100%, 15%) = #004D3D)
    const defaultColor = { r: 0, g: 0.302, b: 0.239 };

    if (!primaryColor) {
      return defaultColor;
    }

    const color = this.hexToRgb(primaryColor);

    // Check for NaN values (parseInt returns NaN for invalid hex)
    if (
      Number.isNaN(color.r) ||
      Number.isNaN(color.g) ||
      Number.isNaN(color.b)
    ) {
      console.warn(
        'Invalid primary color format, using default:',
        primaryColor,
      );
      return defaultColor;
    }

    return color;
  }

  private readonly TRUST_APP_URL =
    process.env.TRUST_APP_URL ||
    process.env.BASE_URL ||
    'http://localhost:3008';

  private generateToken(length: number): string {
    return randomBytes(length).toString('base64url').slice(0, length);
  }

  /**
   * Normalize URL by removing trailing slash
   */
  private normalizeUrl(input: string): string {
    return input.endsWith('/') ? input.slice(0, -1) : input;
  }

  /**
   * Normalize domain by removing protocol and path
   */
  private normalizeDomain(input: string): string {
    const trimmed = input.trim();
    const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
    const withoutPath = withoutProtocol.split('/')[0] ?? withoutProtocol;
    return withoutPath.trim().toLowerCase();
  }

  /**
   * Ensure organization has a friendlyUrl, defaulting to organizationId
   */
  private async ensureFriendlyUrl(organizationId: string): Promise<string> {
    const current = await db.trust.findUnique({
      where: { organizationId },
      select: { friendlyUrl: true },
    });

    if (current?.friendlyUrl) return current.friendlyUrl;

    // Use organizationId as the default friendlyUrl (guaranteed unique)
    try {
      await db.trust.upsert({
        where: { organizationId },
        update: { friendlyUrl: organizationId },
        create: {
          organizationId,
          friendlyUrl: organizationId,
          status: 'published',
        },
      });
      return organizationId;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // If somehow there's a conflict, the friendlyUrl already exists
        const existing = await db.trust.findUnique({
          where: { organizationId },
          select: { friendlyUrl: true },
        });
        return existing?.friendlyUrl ?? organizationId;
      }
      throw error;
    }
  }

  /**
   * Build portal base URL, checking custom domain first
   */
  private async buildPortalBaseUrl(params: {
    organizationId: string;
    organizationName: string;
  }): Promise<string> {
    const { organizationId } = params;

    const trust = await db.trust.findUnique({
      where: { organizationId },
      select: { domain: true, domainVerified: true, friendlyUrl: true },
    });

    if (trust?.domain && trust.domainVerified) {
      return `https://${this.normalizeDomain(trust.domain)}`;
    }

    const urlId =
      trust?.friendlyUrl || (await this.ensureFriendlyUrl(organizationId));

    return `${this.normalizeUrl(this.TRUST_APP_URL)}/${urlId}`;
  }

  /**
   * Build portal access URL with access token
   */
  private async buildPortalAccessUrl(params: {
    organizationId: string;
    organizationName: string;
    accessToken: string;
  }): Promise<string> {
    const { organizationId, organizationName, accessToken } = params;
    const base = await this.buildPortalBaseUrl({
      organizationId,
      organizationName,
    });
    return `${base}/access/${accessToken}`;
  }

  private async findPublishedTrustByRouteId(id: string) {
    // First, try treating `id` as the existing friendlyUrl.
    let trust = await db.trust.findUnique({
      where: { friendlyUrl: id },
      include: { organization: true },
    });

    // If none found, fall back to treating `id` as organizationId.
    if (!trust) {
      trust = await db.trust.findFirst({
        where: { organizationId: id },
        include: { organization: true },
      });
    }

    // If still no trust record but we have an organization, auto-create it
    if (!trust) {
      const organization = await db.organization.findUnique({
        where: { id },
      });

      if (!organization) {
        throw new NotFoundException('Trust site not found');
      }

      // Auto-create trust record with organizationId as friendlyUrl
      trust = await db.trust.create({
        data: {
          organizationId: id,
          friendlyUrl: id,
          status: 'published',
        },
        include: { organization: true },
      });
    }

    // Ensure the trust portal is published (auto-publish if draft)
    if (trust.status !== 'published') {
      trust = await db.trust.update({
        where: { organizationId: trust.organizationId },
        data: { status: 'published' },
        include: { organization: true },
      });
    }

    return trust;
  }

  constructor(
    private readonly ndaPdfService: NdaPdfService,
    private readonly emailService: TrustEmailService,
    private readonly attachmentsService: AttachmentsService,
    private readonly pdfRendererService: PolicyPdfRendererService,
  ) {
    if (
      !process.env.TRUST_APP_URL &&
      !process.env.BASE_URL &&
      process.env.NODE_ENV === 'production'
    ) {
      throw new Error('TRUST_APP_URL or BASE_URL must be set in production');
    }
  }

  async getMemberIdFromUserId(
    userId: string,
    organizationId: string,
  ): Promise<string | undefined> {
    const member = await db.member.findFirst({
      where: {
        userId,
        organizationId,
      },
      select: {
        id: true,
      },
    });
    return member?.id;
  }

  async createAccessRequest(
    id: string,
    dto: CreateAccessRequestDto,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ) {
    const trust = await this.findPublishedTrustByRouteId(id);

    // Check if the email already has an active grant
    const existingGrant = await db.trustAccessGrant.findFirst({
      where: {
        subjectEmail: dto.email,
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
        accessRequest: {
          organizationId: trust.organizationId,
        },
      },
      include: {
        accessRequest: true,
      },
    });

    if (existingGrant) {
      return {
        id: existingGrant.id,
        status: 'already_approved',
        message: 'You already have active access',
        grant: {
          expiresAt: existingGrant.expiresAt,
        },
      };
    }

    const existingRequest = await db.trustAccessRequest.findFirst({
      where: {
        organizationId: trust.organizationId,
        email: dto.email,
        status: 'under_review',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'You already have a pending request for this organization',
      );
    }

    const request = await db.trustAccessRequest.create({
      data: {
        organizationId: trust.organizationId,
        name: dto.name,
        email: dto.email,
        company: dto.company,
        jobTitle: dto.jobTitle,
        purpose: dto.purpose,
        requestedDurationDays: dto.requestedDurationDays,
        status: 'under_review',
        ipAddress,
        userAgent,
      },
    });

    // Send notification email to organization
    await this.sendAccessRequestNotificationToOrg(
      trust.organizationId,
      request.id,
      trust.organization.name,
      dto,
    );

    return {
      id: request.id,
      status: request.status,
      message: 'Access request submitted for review',
    };
  }

  private async sendAccessRequestNotificationToOrg(
    organizationId: string,
    requestId: string,
    organizationName: string,
    dto: CreateAccessRequestDto,
  ) {
    // Get contact email from Trust or fallback to owner/admin emails
    const trust = await db.trust.findUnique({
      where: { organizationId },
      select: { contactEmail: true },
    });

    let notificationEmails: string[] = [];

    // Use contactEmail if available
    if (trust?.contactEmail) {
      notificationEmails.push(trust.contactEmail);
    } else {
      // Fallback: Get owner and admin emails
      const members = await db.member.findMany({
        where: {
          organizationId,
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      // Filter for members with owner or admin role (handles comma-separated roles)
      const ownerAdminMembers = members.filter((m) => {
        const role = m.role.toLowerCase();
        return role.includes('owner') || role.includes('admin');
      });

      notificationEmails = ownerAdminMembers
        .map((m) => m.user.email)
        .filter((email): email is string => !!email);
    }

    // If no notification emails found, skip sending
    if (notificationEmails.length === 0) {
      return;
    }

    // Construct review URL
    const reviewUrl = `${process.env.BETTER_AUTH_URL}/${organizationId}/trust`;

    // Send notification to all recipients
    const emailPromises = notificationEmails.map((email) =>
      this.emailService.sendAccessRequestNotification({
        toEmail: email,
        organizationName,
        requesterName: dto.name,
        requesterEmail: dto.email,
        requesterCompany: dto.company,
        requesterJobTitle: dto.jobTitle,
        purpose: dto.purpose,
        requestedDurationDays: dto.requestedDurationDays,
        reviewUrl,
      }),
    );

    await Promise.allSettled(emailPromises);
  }

  async listAccessRequests(organizationId: string, dto: ListAccessRequestsDto) {
    const where = {
      organizationId,
      ...(dto.status && { status: dto.status }),
    };

    const requests = await db.trustAccessRequest.findMany({
      where,
      include: {
        reviewer: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
        grant: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  async getAccessRequest(organizationId: string, requestId: string) {
    const request = await db.trustAccessRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
        grant: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    return request;
  }

  /**
   * Extract domain from email address
   */
  private extractEmailDomain(email: string): string {
    const parts = email.split('@');
    return (parts[1] ?? '').toLowerCase().trim();
  }

  /**
   * Check if email domain is in the allow list (bypasses NDA requirement)
   */
  private isDomainInAllowList(
    email: string,
    allowedDomains: string[],
  ): boolean {
    if (!allowedDomains || allowedDomains.length === 0) {
      return false;
    }

    const emailDomain = this.extractEmailDomain(email);
    if (!emailDomain) {
      return false;
    }

    return allowedDomains.some(
      (allowed) => allowed.toLowerCase().trim() === emailDomain,
    );
  }

  async approveRequest(
    organizationId: string,
    requestId: string,
    dto: ApproveAccessRequestDto,
    memberId?: string,
  ) {
    const request = await db.trustAccessRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
      include: {
        organization: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.status !== 'under_review') {
      throw new BadRequestException(
        `Request is already ${request.status}, cannot approve`,
      );
    }

    const durationDays =
      dto.durationDays || request.requestedDurationDays || 30;

    const member = memberId
      ? await db.member.findFirst({
          where: { id: memberId, organizationId },
          select: { id: true, userId: true },
        })
      : null;

    if (!member) {
      throw new BadRequestException('Invalid member ID');
    }

    // Check if email domain is in the allow list
    const trust = await db.trust.findUnique({
      where: { organizationId },
      select: { allowedDomains: true },
    });

    const isAllowedDomain = this.isDomainInAllowList(
      request.email,
      trust?.allowedDomains ?? [],
    );

    // If domain is in allow list, skip NDA and grant access directly
    if (isAllowedDomain) {
      return this.approveWithoutNda({
        organizationId,
        requestId,
        request,
        member,
        durationDays,
      });
    }

    // Standard flow: require NDA signing
    const signToken = this.generateToken(32);
    const signTokenExpiresAt = new Date();
    signTokenExpiresAt.setDate(signTokenExpiresAt.getDate() + 7);

    const result = await db.$transaction(async (tx) => {
      const ndaAgreement = await tx.trustNDAAgreement.create({
        data: {
          organizationId,
          accessRequestId: requestId,
          signToken,
          signTokenExpiresAt,
          status: 'pending',
        },
      });

      const updatedRequest = await tx.trustAccessRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewerMemberId: member.id,
          reviewedAt: new Date(),
          requestedDurationDays: durationDays,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: member.userId,
          memberId: member.id,
          entityType: 'trust',
          entityId: requestId,
          description: `Access request approved for ${request.email}, NDA signature required`,
          data: {
            requestId,
            ndaAgreementId: ndaAgreement.id,
            durationDays,
          },
        },
      });

      return { request: updatedRequest, ndaAgreement, durationDays };
    });

    const ndaSigningLink = `${this.TRUST_APP_URL}/nda/${result.ndaAgreement.signToken}`;

    await this.emailService.sendNdaSigningEmail({
      toEmail: request.email,
      toName: request.name,
      organizationName: request.organization.name,
      ndaSigningLink,
    });

    return {
      request: result.request,
      ndaAgreement: result.ndaAgreement,
      message: 'NDA signing email sent',
    };
  }

  /**
   * Approve request without NDA for allowed domains - grants immediate access
   */
  private async approveWithoutNda({
    organizationId,
    requestId,
    request,
    member,
    durationDays,
  }: {
    organizationId: string;
    requestId: string;
    request: {
      email: string;
      name: string;
      organization: { name: string };
    };
    member: { id: string; userId: string };
    durationDays: number;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const accessToken = this.generateToken(32);
    const accessTokenExpiresAt = new Date();
    accessTokenExpiresAt.setHours(accessTokenExpiresAt.getHours() + 24);

    const result = await db.$transaction(async (tx) => {
      const updatedRequest = await tx.trustAccessRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewerMemberId: member.id,
          reviewedAt: new Date(),
          requestedDurationDays: durationDays,
        },
      });

      const grant = await tx.trustAccessGrant.create({
        data: {
          accessRequestId: requestId,
          subjectEmail: request.email,
          expiresAt,
          accessToken,
          accessTokenExpiresAt,
          issuedByMemberId: member.id,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: member.userId,
          memberId: member.id,
          entityType: 'trust',
          entityId: requestId,
          description: `Access request approved for ${request.email} (allowed domain - NDA bypassed)`,
          data: {
            requestId,
            grantId: grant.id,
            durationDays,
            ndaBypassed: true,
          },
        },
      });

      return { request: updatedRequest, grant };
    });

    const portalUrl = await this.buildPortalAccessUrl({
      organizationId,
      organizationName: request.organization.name,
      accessToken,
    });

    await this.emailService.sendAccessGrantedEmail({
      toEmail: request.email,
      toName: request.name,
      organizationName: request.organization.name,
      expiresAt: result.grant.expiresAt,
      portalUrl,
    });

    return {
      request: result.request,
      grant: result.grant,
      message: 'Access granted', // NDA bypassed for allowed domain
    };
  }

  async denyRequest(
    organizationId: string,
    requestId: string,
    dto: DenyAccessRequestDto,
    memberId?: string,
  ) {
    const request = await db.trustAccessRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.status !== 'under_review') {
      throw new BadRequestException(
        `Request is already ${request.status}, cannot deny`,
      );
    }

    const member = memberId
      ? await db.member.findFirst({
          where: { id: memberId, organizationId },
          select: { id: true, userId: true },
        })
      : null;

    if (!member) {
      throw new BadRequestException('Invalid member ID');
    }

    const updatedRequest = await db.trustAccessRequest.update({
      where: { id: requestId },
      data: {
        status: 'denied',
        reviewerMemberId: member.id,
        reviewedAt: new Date(),
        decisionReason: dto.reason,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId,
        userId: member.userId,
        memberId: member.id,
        entityType: 'trust',
        entityId: requestId,
        description: `Access request denied for ${request.email}`,
        data: {
          requestId,
          reason: dto.reason,
        },
      },
    });

    return updatedRequest;
  }

  async listGrants(organizationId: string) {
    const now = new Date();

    // Update expired grants that are still marked as active
    await db.trustAccessGrant.updateMany({
      where: {
        accessRequest: {
          organizationId,
        },
        status: 'active',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'expired',
      },
    });

    const grants = await db.trustAccessGrant.findMany({
      where: {
        accessRequest: {
          organizationId,
        },
      },
      include: {
        accessRequest: {
          select: {
            name: true,
            email: true,
            company: true,
            purpose: true,
          },
        },
        issuedBy: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
        revokedBy: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return grants;
  }

  async revokeGrant(
    organizationId: string,
    grantId: string,
    dto: RevokeGrantDto,
    memberId?: string,
  ) {
    const grant = await db.trustAccessGrant.findFirst({
      where: {
        id: grantId,
        accessRequest: {
          organizationId,
        },
      },
      include: {
        accessRequest: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Grant not found');
    }

    if (grant.status !== 'active') {
      throw new BadRequestException(`Grant is already ${grant.status}`);
    }

    const member = memberId
      ? await db.member.findFirst({
          where: { id: memberId, organizationId },
          select: { id: true, userId: true },
        })
      : null;

    if (!member) {
      throw new BadRequestException('Invalid member ID');
    }

    const updatedGrant = await db.trustAccessGrant.update({
      where: { id: grantId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedByMemberId: member.id,
        revokeReason: dto.reason,
      },
    });

    // Void the associated NDA agreement if it exists
    await db.trustNDAAgreement.updateMany({
      where: { grantId },
      data: { status: 'void' },
    });

    await db.auditLog.create({
      data: {
        organizationId: grant.accessRequest.organizationId,
        userId: member.userId,
        memberId: member.id,
        entityType: 'trust',
        entityId: grantId,
        description: `Access grant revoked for ${grant.subjectEmail}`,
        data: {
          grantId,
          reason: dto.reason,
        },
      },
    });

    return updatedGrant;
  }

  async resendAccessGrantEmail(organizationId: string, grantId: string) {
    const grant = await db.trustAccessGrant.findFirst({
      where: {
        id: grantId,
        accessRequest: {
          organizationId,
        },
      },
      include: {
        accessRequest: {
          include: {
            organization: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Grant not found');
    }

    if (grant.status !== 'active') {
      throw new BadRequestException(
        `Cannot resend access email for ${grant.status} grant`,
      );
    }

    const now = new Date();

    // Check if grant has expired
    if (grant.expiresAt < now) {
      throw new BadRequestException(
        'Cannot resend access email for expired grant',
      );
    }

    // Generate a new access token if expired or missing
    let accessToken = grant.accessToken;

    if (
      !accessToken ||
      (grant.accessTokenExpiresAt && grant.accessTokenExpiresAt < now)
    ) {
      accessToken = this.generateToken(32);
      const accessTokenExpiresAt = new Date(
        now.getTime() + 24 * 60 * 60 * 1000,
      );

      await db.trustAccessGrant.update({
        where: { id: grantId },
        data: { accessToken, accessTokenExpiresAt },
      });
    }

    const portalUrl = await this.buildPortalAccessUrl({
      organizationId,
      organizationName: grant.accessRequest.organization.name,
      accessToken,
    });

    await this.emailService.sendAccessGrantedEmail({
      toEmail: grant.subjectEmail,
      toName: grant.accessRequest.name,
      organizationName: grant.accessRequest.organization.name,
      expiresAt: grant.expiresAt,
      portalUrl,
    });

    return { message: 'Access email resent successfully' };
  }

  async getNdaByToken(token: string) {
    const nda = await db.trustNDAAgreement.findUnique({
      where: { signToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
        grant: true,
      },
    });

    if (!nda) {
      throw new NotFoundException('NDA agreement not found');
    }

    const portalUrl = await this.buildPortalBaseUrl({
      organizationId: nda.organizationId,
      organizationName: nda.accessRequest.organization.name,
    });

    const baseResponse = {
      id: nda.id,
      organizationName: nda.accessRequest.organization.name,
      requesterName: nda.accessRequest.name,
      requesterEmail: nda.accessRequest.email,
      expiresAt: nda.signTokenExpiresAt,
      portalUrl,
    };

    if (nda.signTokenExpiresAt < new Date()) {
      return {
        ...baseResponse,
        status: 'expired',
        message: 'NDA signing link has expired',
      };
    }

    if (nda.status === 'void') {
      return {
        ...baseResponse,
        status: 'void',
        message: 'This NDA has been revoked and is no longer valid',
      };
    }

    if (nda.status === 'signed') {
      let accessUrl: string | null = portalUrl;
      if (nda.grant?.accessToken && nda.grant.status === 'active') {
        accessUrl = await this.buildPortalAccessUrl({
          organizationId: nda.organizationId,
          organizationName: nda.accessRequest.organization.name,
          accessToken: nda.grant.accessToken,
        });
      }

      return {
        ...baseResponse,
        status: 'signed',
        message: 'NDA has already been signed',
        portalUrl: accessUrl,
      };
    }

    return {
      ...baseResponse,
      status: 'pending',
    };
  }

  async signNda(
    token: string,
    signerName: string,
    signerEmail: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ) {
    const nda = await db.trustNDAAgreement.findUnique({
      where: { signToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
        grant: true,
      },
    });

    if (!nda) {
      throw new NotFoundException('NDA agreement not found');
    }

    if (nda.signTokenExpiresAt < new Date()) {
      throw new BadRequestException('NDA signing link has expired');
    }

    if (nda.status === 'void') {
      throw new BadRequestException(
        'This NDA has been revoked and is no longer valid',
      );
    }

    if (nda.status === 'signed' && nda.grant) {
      const pdfUrl = nda.pdfSignedKey
        ? await this.ndaPdfService.getSignedUrl(nda.pdfSignedKey)
        : null;

      const accessToken = nda.grant.accessToken || this.generateToken(32);
      const accessTokenExpiresAt =
        nda.grant.accessTokenExpiresAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000);

      if (!nda.grant.accessToken) {
        await db.trustAccessGrant.update({
          where: { id: nda.grant.id },
          data: { accessToken, accessTokenExpiresAt },
        });
      }

      const portalUrl = await this.buildPortalAccessUrl({
        organizationId: nda.organizationId,
        organizationName: nda.accessRequest.organization.name,
        accessToken,
      });

      return {
        message: 'NDA already signed',
        grant: nda.grant,
        pdfDownloadUrl: pdfUrl,
        portalUrl,
        expiresAt: nda.grant.expiresAt,
      };
    }

    if (nda.status !== 'pending') {
      throw new BadRequestException('NDA has already been signed');
    }

    const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
      organizationName: nda.accessRequest.organization.name,
      signerName,
      signerEmail,
      agreementId: nda.id,
    });

    const pdfKey = await this.ndaPdfService.uploadNdaPdf(
      nda.organizationId,
      nda.id,
      pdfBuffer,
    );

    const durationDays = nda.accessRequest.requestedDurationDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const accessToken = this.generateToken(32);
    const accessTokenExpiresAt = new Date();
    accessTokenExpiresAt.setHours(accessTokenExpiresAt.getHours() + 24);

    const result = await db.$transaction(async (tx) => {
      const grant = await tx.trustAccessGrant.create({
        data: {
          accessRequestId: nda.accessRequestId,
          subjectEmail: signerEmail,
          expiresAt,
          accessToken,
          accessTokenExpiresAt,
        },
      });

      const updatedNda = await tx.trustNDAAgreement.update({
        where: { id: nda.id },
        data: {
          status: 'signed',
          signerName,
          signerEmail,
          signedAt: new Date(),
          pdfSignedKey: pdfKey,
          grantId: grant.id,
          ipAddress,
          userAgent,
        },
      });

      return { grant, updatedNda };
    });

    const portalUrl = await this.buildPortalAccessUrl({
      organizationId: nda.organizationId,
      organizationName: nda.accessRequest.organization.name,
      accessToken,
    });

    await this.emailService.sendAccessGrantedEmail({
      toEmail: signerEmail,
      toName: signerName,
      organizationName: nda.accessRequest.organization.name,
      expiresAt: result.grant.expiresAt,
      portalUrl,
    });

    const pdfUrl = await this.ndaPdfService.getSignedUrl(pdfKey);

    return {
      message: 'NDA signed successfully',
      grant: result.grant,
      pdfDownloadUrl: pdfUrl,
      portalUrl,
      expiresAt: result.grant.expiresAt,
    };
  }

  async resendNda(organizationId: string, requestId: string) {
    const request = await db.trustAccessRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
      include: {
        organization: true,
        ndaAgreements: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    if (request.status !== 'approved') {
      throw new BadRequestException('Request must be approved first');
    }

    const pendingNda = request.ndaAgreements[0];
    if (!pendingNda) {
      throw new BadRequestException('No pending NDA agreement found');
    }

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await db.trustNDAAgreement.update({
      where: { id: pendingNda.id },
      data: { signTokenExpiresAt: newExpiresAt },
    });

    const ndaSigningLink = `${this.TRUST_APP_URL}/nda/${pendingNda.signToken}`;

    await this.emailService.sendNdaSigningEmail({
      toEmail: request.email,
      toName: request.name,
      organizationName: request.organization.name,
      ndaSigningLink,
    });

    return {
      message: 'NDA signing email resent',
    };
  }

  async previewNda(organizationId: string, requestId: string) {
    const request = await db.trustAccessRequest.findFirst({
      where: {
        id: requestId,
        organizationId,
      },
      include: {
        organization: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Access request not found');
    }

    const previewId = this.generateToken(16);
    const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
      organizationName: request.organization.name,
      signerName: request.name,
      signerEmail: request.email,
      agreementId: `preview-${previewId}`,
    });

    const fileName = `preview-nda-${requestId}-${Date.now()}.pdf`;
    const s3Key = await this.attachmentsService.uploadToS3(
      pdfBuffer,
      fileName,
      'application/pdf',
      organizationId,
      'trust_nda',
      `preview-${previewId}`,
    );

    const pdfUrl = await this.ndaPdfService.getSignedUrl(s3Key);

    return {
      message: 'Preview NDA generated',
      previewId,
      s3Key,
      pdfDownloadUrl: pdfUrl,
    };
  }

  async previewNdaByToken(token: string) {
    const nda = await db.trustNDAAgreement.findUnique({
      where: { signToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!nda) {
      throw new NotFoundException('NDA not found or token expired');
    }

    if (nda.signTokenExpiresAt < new Date()) {
      throw new BadRequestException('NDA signing link has expired');
    }

    const previewId = this.generateToken(16);
    const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
      organizationName: nda.accessRequest.organization.name,
      signerName: nda.accessRequest.name,
      signerEmail: nda.accessRequest.email,
      agreementId: `preview-${previewId}`,
    });

    const fileName = `preview-nda-${nda.id}-${Date.now()}.pdf`;
    const s3Key = await this.attachmentsService.uploadToS3(
      pdfBuffer,
      fileName,
      'application/pdf',
      nda.organizationId,
      'trust_nda',
      `preview-${previewId}`,
    );

    const pdfUrl = await this.ndaPdfService.getSignedUrl(s3Key);

    return {
      message: 'Preview NDA generated',
      previewId,
      s3Key,
      pdfDownloadUrl: pdfUrl,
    };
  }

  async reclaimAccess(id: string, email: string, query?: string) {
    const trust = await this.findPublishedTrustByRouteId(id);

    const grant = await db.trustAccessGrant.findFirst({
      where: {
        subjectEmail: email,
        status: 'active',
        expiresAt: {
          gt: new Date(),
        },
        accessRequest: {
          organizationId: trust.organizationId,
        },
      },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
        ndaAgreement: true,
      },
    });

    if (!grant) {
      throw new NotFoundException(
        'No active access grant found for this email',
      );
    }

    let accessToken = grant.accessToken;
    let accessTokenExpiresAt = grant.accessTokenExpiresAt;

    if (
      !accessToken ||
      !accessTokenExpiresAt ||
      accessTokenExpiresAt < new Date()
    ) {
      accessToken = this.generateToken(32);
      accessTokenExpiresAt = new Date();
      accessTokenExpiresAt.setHours(accessTokenExpiresAt.getHours() + 24);

      await db.trustAccessGrant.update({
        where: { id: grant.id },
        data: {
          accessToken,
          accessTokenExpiresAt,
        },
      });
    }

    let accessLink = await this.buildPortalAccessUrl({
      organizationId: trust.organizationId,
      organizationName: grant.accessRequest.organization.name,
      accessToken,
    });

    // Append query parameter if provided
    if (query) {
      const separator = accessLink.includes('?') ? '&' : '?';
      accessLink = `${accessLink}${separator}query=${encodeURIComponent(query)}`;
    }

    await this.emailService.sendAccessReclaimEmail({
      toEmail: email,
      toName: grant.accessRequest.name,
      organizationName: grant.accessRequest.organization.name,
      accessLink,
      expiresAt: grant.expiresAt,
    });

    return {
      message: 'Access link sent to your email',
      accessLink,
      expiresAt: accessTokenExpiresAt,
    };
  }

  async getGrantByAccessToken(token: string) {
    const grant = await db.trustAccessGrant.findUnique({
      where: { accessToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
        ndaAgreement: true,
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid access token');
    }

    if (grant.status !== 'active') {
      throw new BadRequestException('Access grant is not active');
    }

    if (grant.expiresAt < new Date()) {
      throw new BadRequestException('Access grant has expired');
    }

    if (
      !grant.accessTokenExpiresAt ||
      grant.accessTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Access token has expired');
    }

    const ndaPdfUrl = grant.ndaAgreement?.pdfSignedKey
      ? await this.ndaPdfService.getSignedUrl(grant.ndaAgreement.pdfSignedKey)
      : null;

    return {
      organizationName: grant.accessRequest.organization.name,
      expiresAt: grant.expiresAt,
      subjectEmail: grant.subjectEmail,
      ndaPdfUrl,
    };
  }

  async validateAccessTokenAndGetOrganizationId(
    token: string,
  ): Promise<string> {
    const grant = await this.validateAccessToken(token);
    return grant.accessRequest.organizationId;
  }

  private async validateAccessToken(token: string) {
    const grant = await db.trustAccessGrant.findUnique({
      where: { accessToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid access token');
    }

    if (grant.status !== 'active') {
      throw new BadRequestException('Access grant is not active');
    }

    if (grant.expiresAt < new Date()) {
      throw new BadRequestException('Access grant has expired');
    }

    if (
      !grant.accessTokenExpiresAt ||
      grant.accessTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Access token has expired');
    }

    return grant;
  }

  async getPoliciesByAccessToken(token: string) {
    const grant = await db.trustAccessGrant.findUnique({
      where: { accessToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid access token');
    }

    if (grant.status !== 'active') {
      throw new BadRequestException('Access grant is not active');
    }

    if (grant.expiresAt < new Date()) {
      throw new BadRequestException('Access grant has expired');
    }

    if (
      !grant.accessTokenExpiresAt ||
      grant.accessTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Access token has expired');
    }

    const policies = await db.policy.findMany({
      where: {
        organizationId: grant.accessRequest.organizationId,
        status: 'published',
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        description: true,
        lastPublishedAt: true,
        updatedAt: true,
        currentVersion: {
          select: {
            id: true,
            version: true,
          },
        },
      },
      orderBy: [{ lastPublishedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return policies;
  }

  async getComplianceResourcesByAccessToken(token: string) {
    const grant = await db.trustAccessGrant.findUnique({
      where: { accessToken: token },
      include: {
        accessRequest: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Invalid access token');
    }

    if (grant.status !== 'active') {
      throw new BadRequestException('Access grant is not active');
    }

    if (grant.expiresAt < new Date()) {
      throw new BadRequestException('Access grant has expired');
    }

    if (
      !grant.accessTokenExpiresAt ||
      grant.accessTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Access token has expired');
    }

    const complianceResources = await db.trustResource.findMany({
      where: {
        organizationId: grant.accessRequest.organizationId,
      },
      select: {
        framework: true,
        fileName: true,
        fileSize: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Return all resources - the download endpoint will auto-enable frameworks as needed
    return complianceResources.map((resource) => ({
      framework: resource.framework,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      updatedAt: resource.updatedAt.toISOString(),
    }));
  }

  async getTrustDocumentsByAccessToken(token: string) {
    const grant = await this.validateAccessToken(token);

    const documents = await db.trustDocument.findMany({
      where: {
        organizationId: grant.accessRequest.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  async getTrustDocumentUrlByAccessToken(token: string, documentId: string) {
    const grant = await this.validateAccessToken(token);

    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      throw new InternalServerErrorException(
        'Organization assets bucket is not configured',
      );
    }

    const document = await db.trustDocument.findFirst({
      where: {
        id: documentId,
        organizationId: grant.accessRequest.organizationId,
        isActive: true,
      },
      select: {
        name: true,
        s3Key: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const getCommand = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: document.s3Key,
      ResponseContentDisposition: `attachment; filename="${document.name.replaceAll('"', '')}"`,
    });

    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 900,
    });

    return {
      signedUrl,
      fileName: document.name,
    };
  }

  async downloadAllTrustDocumentsByAccessToken(token: string) {
    const grant = await this.validateAccessToken(token);

    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      throw new InternalServerErrorException(
        'Organization assets bucket is not configured',
      );
    }

    const organizationId = grant.accessRequest.organizationId;
    const documents = await db.trustDocument.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        s3Key: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (documents.length === 0) {
      throw new NotFoundException('No additional documents available');
    }

    const timestamp = Date.now();
    const zipKey = `${organizationId}/trust-documents/bundles/${grant.id}-${timestamp}.zip`;

    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipStream = new PassThrough();
    let putPromise: Promise<unknown> | undefined;

    try {
      putPromise = s3Client.send(
        new PutObjectCommand({
          Bucket: APP_AWS_ORG_ASSETS_BUCKET,
          Key: zipKey,
          Body: zipStream,
          ContentType: 'application/zip',
          Metadata: {
            organizationId,
            grantId: grant.id,
            kind: 'trust_documents_bundle',
          },
        }),
      );

      archive.on('error', (err) => {
        zipStream.destroy(err);
      });

      archive.pipe(zipStream);

      // Track names case-insensitively to avoid collisions on case-insensitive filesystems
      // (e.g. Windows/macOS): "Report.pdf" vs "report.pdf"
      const usedNamesLower = new Set<string>();
      const toSafeName = (name: string): string => {
        const sanitized =
          name.replace(/[^\w.\-() ]/g, '_').trim() || 'document';
        const dot = sanitized.lastIndexOf('.');
        const base = dot > 0 ? sanitized.slice(0, dot) : sanitized;
        const ext = dot > 0 ? sanitized.slice(dot) : '';

        let candidate = `${base}${ext}`;
        let i = 1;
        while (usedNamesLower.has(candidate.toLowerCase())) {
          candidate = `${base} (${i})${ext}`;
          i += 1;
        }
        usedNamesLower.add(candidate.toLowerCase());
        return candidate;
      };

      for (const doc of documents) {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: APP_AWS_ORG_ASSETS_BUCKET,
            Key: doc.s3Key,
          }),
        );

        if (!response.Body) {
          throw new InternalServerErrorException(
            `No file data received from S3 for document ${doc.id}`,
          );
        }

        const bodyStream =
          response.Body instanceof Readable
            ? response.Body
            : Readable.from(response.Body as any);

        archive.append(bodyStream, { name: toSafeName(doc.name) });
      }

      await archive.finalize();
      await putPromise;
    } catch (error) {
      // Ensure the upload stream is closed, otherwise the S3 PutObject may hang/reject later.
      try {
        archive.abort();
      } catch {
        // ignore
      }

      if (!zipStream.destroyed) {
        zipStream.destroy(
          error instanceof Error ? error : new Error('ZIP generation failed'),
        );
      }

      // Avoid unhandled rejections from an in-flight S3 put.
      await putPromise?.catch(() => undefined);

      throw error;
    }

    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: zipKey,
        ResponseContentDisposition: `attachment; filename="additional-documents-${timestamp}.zip"`,
      }),
      { expiresIn: 900 },
    );

    return {
      name: 'Additional Documents',
      fileCount: documents.length,
      downloadUrl: signedUrl,
    };
  }

  /**
   * Get FAQ markdown for a published trust portal.
   *
   * Recommended markdown format:
   * - Use ### headings for questions (e.g., "### What is your security policy?")
   * - Use regular markdown text for answers
   * - Supports standard markdown: links, lists, code blocks, etc.
   *
   * Important: Render markdown WITHOUT rehype-raw (no raw HTML) for security.
   *
   * @param friendlyUrl - Trust portal friendly URL or organization ID
   * @returns FAQ markdown content (empty string if not configured)
   */
  async getFaqs(friendlyUrl: string): Promise<{ faqs: any[] | null }> {
    const trust = await this.findPublishedTrustByRouteId(friendlyUrl);
    const organization = await db.organization.findUnique({
      where: { id: trust.organizationId },
      select: { trustPortalFaqs: true },
    });

    const faqs = organization?.trustPortalFaqs;
    return { faqs: Array.isArray(faqs) ? faqs : null };
  }

  async getComplianceResourceUrlByAccessToken(
    token: string,
    framework: TrustFramework,
  ) {
    const grant = await this.validateAccessToken(token);

    // Validate framework enum
    if (!Object.values(TrustFramework).includes(framework)) {
      throw new BadRequestException(`Invalid framework: ${framework}`);
    }

    if (!s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      throw new InternalServerErrorException(
        'Organization assets bucket is not configured',
      );
    }

    const record = await db.trustResource.findUnique({
      where: {
        organizationId_framework: {
          organizationId: grant.accessRequest.organizationId,
          framework,
        },
      },
    });

    if (!record) {
      throw new NotFoundException(
        `No certificate uploaded for framework ${framework}`,
      );
    }

    // Check if framework is enabled in Trust record and auto-enable if not (for backward compatibility)
    const trustRecord = await db.trust.findUnique({
      where: { organizationId: grant.accessRequest.organizationId },
    });

    const frameworkFieldMap: Record<
      TrustFramework,
      | 'iso27001'
      | 'iso42001'
      | 'gdpr'
      | 'hipaa'
      | 'soc2type1'
      | 'soc2type2'
      | 'pci_dss'
      | 'nen7510'
      | 'iso9001'
    > = {
      [TrustFramework.iso_27001]: 'iso27001',
      [TrustFramework.iso_42001]: 'iso42001',
      [TrustFramework.gdpr]: 'gdpr',
      [TrustFramework.hipaa]: 'hipaa',
      [TrustFramework.soc2_type1]: 'soc2type1',
      [TrustFramework.soc2_type2]: 'soc2type2',
      [TrustFramework.pci_dss]: 'pci_dss',
      [TrustFramework.nen_7510]: 'nen7510',
      [TrustFramework.iso_9001]: 'iso9001',
    };

    const enabledField = frameworkFieldMap[framework];
    if (trustRecord && !trustRecord[enabledField]) {
      // Auto-enable the framework for backward compatibility with old organizations
      await db.trust.update({
        where: { organizationId: grant.accessRequest.organizationId },
        data: {
          [enabledField]: true,
        },
      });
    }

    // Download the original PDF from S3
    const getCommand = new GetObjectCommand({
      Bucket: APP_AWS_ORG_ASSETS_BUCKET,
      Key: record.s3Key,
    });

    const response = await s3Client.send(getCommand);
    const chunks: Uint8Array[] = [];

    if (!response.Body) {
      throw new InternalServerErrorException('No file data received from S3');
    }

    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    const originalPdfBuffer = Buffer.concat(chunks);

    // Watermark the PDF
    const docId = `compliance-${grant.id}-${framework}-${Date.now()}`;
    const watermarked = await this.ndaPdfService.watermarkExistingPdf(
      originalPdfBuffer,
      {
        name: grant.accessRequest.name,
        email: grant.subjectEmail,
        docId,
        watermarkText: 'Comp AI',
      },
    );

    // Upload watermarked PDF to S3
    const key = await this.attachmentsService.uploadToS3(
      watermarked,
      `compliance-${framework}-grant-${grant.id}-${Date.now()}.pdf`,
      'application/pdf',
      grant.accessRequest.organizationId,
      'trust_compliance_downloads',
      `${grant.id}`,
    );

    // Generate signed URL for the watermarked PDF
    const downloadUrl =
      await this.attachmentsService.getPresignedDownloadUrl(key);

    return {
      signedUrl: downloadUrl,
      fileName: record.fileName,
      fileSize: watermarked.length,
    };
  }

  async downloadAllPoliciesByAccessToken(token: string) {
    const grant = await this.validateAccessToken(token);

    const policies = await db.policy.findMany({
      where: {
        organizationId: grant.accessRequest.organizationId,
        status: 'published',
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        content: true,
        pdfUrl: true,
        currentVersion: {
          select: {
            content: true,
            pdfUrl: true,
          },
        },
      },
      orderBy: [{ lastPublishedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (policies.length === 0) {
      throw new NotFoundException('No published policies available');
    }

    // Create merged PDF document
    const mergedPdf = await PDFDocument.create();

    const organizationName =
      grant.accessRequest.organization.name || 'Organization';

    // Get organization primary color or use default
    const accentColor = this.getAccentColor(
      grant.accessRequest.organization.primaryColor,
    );

    // Embed fonts once before the loop (expensive operation)
    const helveticaBold = await mergedPdf.embedFont(
      StandardFonts.HelveticaBold,
    );
    const helvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);

    // Step 1: Fetch/render all PDFs in parallel (expensive I/O operations)
    type PreparedPolicy = {
      policy: (typeof policies)[0];
      pdfBuffer: Buffer;
      isUploaded: boolean;
    };

    // Helper to get effective content and pdfUrl (version first, fallback to policy)
    const getEffectiveData = (policy: (typeof policies)[0]) => {
      const content = policy.currentVersion?.content ?? policy.content;
      const pdfUrl = policy.currentVersion?.pdfUrl ?? policy.pdfUrl;
      return { content, pdfUrl };
    };

    const preparePolicy = async (
      policy: (typeof policies)[0],
    ): Promise<PreparedPolicy> => {
      const { content, pdfUrl } = getEffectiveData(policy);
      const hasUploadedPdf = pdfUrl && pdfUrl.trim() !== '';

      if (hasUploadedPdf) {
        try {
          const pdfBuffer =
            await this.attachmentsService.getObjectBuffer(pdfUrl);
          return {
            policy,
            pdfBuffer: Buffer.from(pdfBuffer),
            isUploaded: true,
          };
        } catch (error) {
          console.warn(
            `Failed to fetch uploaded PDF for policy ${policy.id}, falling back to content rendering:`,
            error,
          );
        }
      }

      // Render from content (either no pdfUrl or fetch failed)
      const renderedBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
        [{ name: policy.name, content }],
        undefined, // We'll add org header during merge
        grant.accessRequest.organization.primaryColor,
        policies.length,
      );
      return { policy, pdfBuffer: renderedBuffer, isUploaded: false };
    };

    const preparedPolicies = await Promise.all(policies.map(preparePolicy));

    // Step 2: Merge PDFs sequentially (must be sequential for PDFDocument operations)
    // Helper to add content-rendered policy to merged PDF
    const addContentRenderedPolicy = async (
      policy: (typeof policies)[0],
      addOrgHeader: boolean,
    ) => {
      const { content } = getEffectiveData(policy);
      const renderedBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
        [{ name: policy.name, content }],
        addOrgHeader ? organizationName : undefined,
        grant.accessRequest.organization.primaryColor,
        policies.length,
      );
      const renderedPdf = await PDFDocument.load(renderedBuffer);
      const copiedPages = await mergedPdf.copyPages(
        renderedPdf,
        renderedPdf.getPageIndices(),
      );
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    };

    let isFirst = true;
    for (const { policy, pdfBuffer, isUploaded } of preparedPolicies) {
      if (isUploaded) {
        try {
          const uploadedPdf = await PDFDocument.load(pdfBuffer, {
            ignoreEncryption: true,
          });

          // Rebuild the FIRST page: embed original page into a taller page
          const originalFirstPage = uploadedPdf.getPage(0);
          const { width, height } = originalFirstPage.getSize();

          const headerHeight = isFirst ? 120 : 60;
          const embeddedFirstPage =
            await mergedPdf.embedPage(originalFirstPage);
          const rebuiltFirstPage = mergedPdf.addPage([
            width,
            height + headerHeight,
          ]);

          rebuiltFirstPage.drawPage(embeddedFirstPage, {
            x: 0,
            y: 0,
            width,
            height,
          });

          let yPos = height + headerHeight - 25;

          if (isFirst) {
            rebuiltFirstPage.drawLine({
              start: { x: 20, y: yPos + 8 },
              end: { x: width - 20, y: yPos + 8 },
              thickness: 2,
              color: rgb(accentColor.r, accentColor.g, accentColor.b),
            });

            rebuiltFirstPage.drawText(`${organizationName} - All Policies`, {
              x: 20,
              y: yPos - 14,
              size: 14,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            });

            const generatedDate = new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            rebuiltFirstPage.drawText(
              `Generated: ${generatedDate} | Total: ${policies.length} policies`,
              {
                x: width - 180,
                y: yPos - 14,
                size: 8,
                font: helvetica,
                color: rgb(0.5, 0.5, 0.5),
              },
            );

            yPos -= 34;
            isFirst = false;
          }

          rebuiltFirstPage.drawRectangle({
            x: 55,
            y: yPos - 40,
            width: 10,
            height: 26,
            color: rgb(accentColor.r, accentColor.g, accentColor.b),
          });

          rebuiltFirstPage.drawText(`POLICY: ${policy.name}`, {
            x: 75,
            y: yPos - 34,
            size: 16,
            font: helveticaBold,
            color: rgb(0.12, 0.16, 0.23),
          });

          // Remaining pages unchanged (page 2..n)
          if (uploadedPdf.getPageCount() > 1) {
            const copiedRemainingPages = await mergedPdf.copyPages(
              uploadedPdf,
              uploadedPdf.getPageIndices().slice(1),
            );
            for (const page of copiedRemainingPages) {
              mergedPdf.addPage(page);
            }
          }
        } catch (error) {
          // PDF is corrupted/malformed, fall back to content rendering
          console.warn(
            `Failed to parse uploaded PDF for policy ${policy.id}, falling back to content rendering:`,
            error,
          );
          await addContentRenderedPolicy(policy, isFirst);
          isFirst = false;
        }
      } else {
        // Content was already rendered, but re-render if first (needs org header)
        await addContentRenderedPolicy(policy, isFirst);
        isFirst = false;
      }
    }

    // Add page numbers to all pages in the merged PDF
    const pages = mergedPdf.getPages();
    const totalPages = pages.length;
    // helvetica font already embedded above

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const { width } = page.getSize();
      const pageNumber = i + 1;

      page.drawText(`Page ${pageNumber} of ${totalPages}`, {
        x: width / 2 - 30,
        y: 15,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBuffer = Buffer.from(await mergedPdf.save());

    const bundleDocId = `bundle-${grant.id}-${Date.now()}`;
    const watermarked = await this.ndaPdfService.watermarkExistingPdf(
      pdfBuffer,
      {
        name: grant.accessRequest.name,
        email: grant.subjectEmail,
        docId: bundleDocId,
      },
    );

    const key = await this.attachmentsService.uploadToS3(
      watermarked,
      `policies-bundle-grant-${grant.id}-${Date.now()}.pdf`,
      'application/pdf',
      grant.accessRequest.organizationId,
      'trust_policy_downloads',
      `${grant.id}`,
    );

    const downloadUrl =
      await this.attachmentsService.getPresignedDownloadUrl(key);

    return { name: 'All Policies', downloadUrl };
  }

  /**
   * Convert a policy name to a safe filename
   * "Security Updates" -> "security_updates"
   */
  private toSafeFilename(name: string): string {
    const safeName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace hyphens with underscores
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores

    // Fallback for non-ASCII only names
    return safeName || 'policy';
  }

  async downloadAllPoliciesAsZipByAccessToken(token: string) {
    const grant = await this.validateAccessToken(token);

    const policies = await db.policy.findMany({
      where: {
        organizationId: grant.accessRequest.organizationId,
        status: 'published',
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        content: true,
        pdfUrl: true,
        currentVersion: {
          select: {
            content: true,
            pdfUrl: true,
          },
        },
      },
      orderBy: [{ lastPublishedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (policies.length === 0) {
      throw new NotFoundException('No published policies available');
    }

    const organizationName =
      grant.accessRequest.organization.name || 'Organization';

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 6 } });
    const passThrough = new PassThrough();

    archive.on('error', (err) => {
      passThrough.destroy(err);
    });

    archive.pipe(passThrough);

    // Track filenames to avoid duplicates (case-insensitive)
    const usedNamesLower = new Set<string>();

    const getUniqueFilename = (baseName: string): string => {
      const filename = this.toSafeFilename(baseName);
      let counter = 1;
      let finalName = filename;

      while (usedNamesLower.has(finalName.toLowerCase())) {
        finalName = `${filename}_${counter}`;
        counter++;
      }

      usedNamesLower.add(finalName.toLowerCase());
      return `${finalName}.pdf`;
    };

    // Process policies sequentially
    for (const policy of policies) {
      // Use currentVersion content/pdfUrl with fallback to policy level
      const effectiveContent = policy.currentVersion?.content ?? policy.content;
      const effectivePdfUrl = policy.currentVersion?.pdfUrl ?? policy.pdfUrl;
      const hasUploadedPdf = effectivePdfUrl && effectivePdfUrl.trim() !== '';
      let policyPdfBuffer: Buffer;

      if (hasUploadedPdf) {
        try {
          const rawBuffer =
            await this.attachmentsService.getObjectBuffer(effectivePdfUrl);
          policyPdfBuffer = Buffer.from(rawBuffer);
        } catch (error) {
          console.warn(
            `Failed to fetch uploaded PDF for policy ${policy.id}, falling back to content rendering:`,
            error,
          );
          policyPdfBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
            [{ name: policy.name, content: effectiveContent }],
            undefined,
            grant.accessRequest.organization.primaryColor,
          );
        }
      } else {
        policyPdfBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
          [{ name: policy.name, content: effectiveContent }],
          undefined,
          grant.accessRequest.organization.primaryColor,
        );
      }

      // Watermark the PDF
      const docId = `policy-${policy.id}-${Date.now()}`;
      const watermarkedPdf = await this.ndaPdfService.watermarkExistingPdf(
        policyPdfBuffer,
        {
          name: grant.accessRequest.name,
          email: grant.subjectEmail,
          docId,
        },
      );

      // Add to archive
      const filename = getUniqueFilename(policy.name);
      archive.append(watermarkedPdf, { name: filename });
    }

    // Collect ZIP buffer - set up listeners BEFORE finalize to avoid deadlock
    const zipBufferPromise = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      passThrough.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      passThrough.on('end', () => resolve(Buffer.concat(chunks)));
      passThrough.on('error', reject);
    });

    // Finalize the archive
    await archive.finalize();

    // Wait for buffer to be collected
    const zipBuffer = await zipBufferPromise;

    // Upload to S3 using attachmentsService (avoids streaming issues)
    const safeOrgName = this.toSafeFilename(organizationName);
    const dateStr = new Date().toISOString().split('T')[0];
    const downloadFilename = `${safeOrgName}_policies_${dateStr}.zip`;

    const zipKey = await this.attachmentsService.uploadToS3(
      zipBuffer,
      downloadFilename,
      'application/zip',
      grant.accessRequest.organizationId,
      'trust_policy_downloads',
      `${grant.id}`,
    );

    // Generate download URL with proper filename
    const downloadUrl =
      await this.attachmentsService.getPresignedDownloadUrlWithFilename(
        zipKey,
        downloadFilename,
      );

    return {
      name: `${organizationName} - All Policies (ZIP)`,
      downloadUrl,
      policyCount: policies.length,
    };
  }

  async getPublicOverview(friendlyUrl: string) {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      select: {
        overviewTitle: true,
        overviewContent: true,
        showOverview: true,
      },
    });

    if (!trust || !trust.showOverview) {
      return null;
    }

    return {
      title: trust.overviewTitle,
      content: trust.overviewContent,
    };
  }

  async getPublicCustomLinks(friendlyUrl: string) {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      select: { organizationId: true },
    });

    if (!trust) {
      return [];
    }

    return db.trustCustomLink.findMany({
      where: {
        organizationId: trust.organizationId,
        isActive: true,
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
      },
    });
  }

  async getPublicFavicon(friendlyUrl: string): Promise<string | null> {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      select: { favicon: true },
    });

    if (!trust?.favicon || !s3Client || !APP_AWS_ORG_ASSETS_BUCKET) {
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: APP_AWS_ORG_ASSETS_BUCKET,
        Key: trust.favicon,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24 hours
    } catch {
      return null;
    }
  }

  async getPublicVendors(friendlyUrl: string) {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      select: { organizationId: true },
    });

    if (!trust) {
      return [];
    }

    const vendors = await db.vendor.findMany({
      where: {
        organizationId: trust.organizationId,
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

    // Get websites to look up in GlobalVendors
    const websiteList = vendors
      .map((v) => v.website)
      .filter((w): w is string => !!w);

    // Fetch GlobalVendors data for trust portal URLs
    const globalVendors = websiteList.length
      ? await db.globalVendors.findMany({
          where: { website: { in: websiteList } },
          select: {
            website: true,
            riskAssessmentData: true,
          },
        })
      : [];

    // Create a map for quick lookup
    const globalVendorMap = new Map(
      globalVendors.map((gv) => [gv.website, gv.riskAssessmentData]),
    );

    // Add icon URLs to compliance badges and trust portal URL
    return vendors.map((vendor) => {
      // Default to original website URL
      let trustPortalUrl: string | null = vendor.website;

      // Try to get trust portal URL from GlobalVendors riskAssessmentData
      if (vendor.website) {
        const riskData = globalVendorMap.get(vendor.website);
        if (riskData && typeof riskData === 'object' && riskData !== null) {
          const links = (riskData as Record<string, unknown>).links;
          if (Array.isArray(links) && links.length > 0) {
            const firstLink = links[0];
            if (
              firstLink &&
              typeof firstLink === 'object' &&
              'url' in firstLink &&
              typeof firstLink.url === 'string'
            ) {
              trustPortalUrl = firstLink.url;
            }
          }
        }
      }
      return {
        ...vendor,
        complianceBadges: this.formatComplianceBadgeLabels(vendor.complianceBadges),
        trustPortalUrl,
      };
    });
  }

  /**
   * Format compliance badges as simple type + label pairs for external rendering.
   * Does NOT include branded icons to avoid implying vendors were certified through us.
   */
  private formatComplianceBadgeLabels(badges: unknown): { type: string; label: string }[] {
    if (!badges || !Array.isArray(badges)) {
      return [];
    }

    const LABEL_MAP: Record<string, string> = {
      soc2: 'SOC 2',
      iso27001: 'ISO 27001',
      iso42001: 'ISO 42001',
      iso9001: 'ISO 9001',
      gdpr: 'GDPR',
      hipaa: 'HIPAA',
      pci_dss: 'PCI DSS',
      nen7510: 'NEN 7510',
      ccpa: 'CCPA',
    };

    return badges.map((badge: { type: string }) => ({
      type: badge.type,
      label: LABEL_MAP[badge.type] ?? badge.type.toUpperCase(),
    }));
  }
}
