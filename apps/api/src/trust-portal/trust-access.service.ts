import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@db';
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
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_AWS_ORG_ASSETS_BUCKET, s3Client } from '../app/s3';
import { TrustFramework } from '@prisma/client';

@Injectable()
export class TrustAccessService {
  private readonly TRUST_APP_URL =
    process.env.TRUST_APP_URL ||
    process.env.BASE_URL ||
    'http://localhost:3008';

  private generateToken(length: number): string {
    return randomBytes(length).toString('base64url').slice(0, length);
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

    if (!trust || trust.status !== 'published') {
      throw new NotFoundException('Trust site not found or not published');
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

    const trust = await db.trust.findUnique({
      where: { organizationId: nda.organizationId },
      select: { friendlyUrl: true },
    });

    const portalUrl = trust?.friendlyUrl
      ? `${this.TRUST_APP_URL}/${trust.friendlyUrl}`
      : null;

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
      let accessUrl = portalUrl;
      if (nda.grant?.accessToken && nda.grant.status === 'active') {
        if (trust?.friendlyUrl) {
          accessUrl = `${this.TRUST_APP_URL}/${trust.friendlyUrl}/access/${nda.grant.accessToken}`;
        }
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

      const trust = await db.trust.findUnique({
        where: { organizationId: nda.organizationId },
        select: { friendlyUrl: true },
      });

      const portalUrl = trust?.friendlyUrl
        ? `${this.TRUST_APP_URL}/${trust.friendlyUrl}/access/${accessToken}`
        : null;

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

    const trust = await db.trust.findUnique({
      where: { organizationId: nda.organizationId },
      select: { friendlyUrl: true },
    });

    const portalUrl = trust?.friendlyUrl
      ? `${this.TRUST_APP_URL}/${trust.friendlyUrl}/access/${accessToken}`
      : null;

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

    const urlId = trust.friendlyUrl || trust.organizationId;
    let accessLink = `${this.TRUST_APP_URL}/${urlId}/access/${accessToken}`;

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
      },
      orderBy: [{ lastPublishedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (policies.length === 0) {
      throw new NotFoundException('No published policies available');
    }

    const pdfBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
      policies.map((p) => ({
        name: p.name,
        content: p.content,
      })),
      grant.accessRequest.organization.name,
    );

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
}
