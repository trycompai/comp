import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
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

@Injectable()
export class TrustAccessService {
  private readonly TRUST_APP_URL =
    process.env.TRUST_APP_URL ||
    process.env.BASE_URL ||
    'http://localhost:3008';

  private generateToken(length: number): string {
    return randomBytes(length).toString('base64url').slice(0, length);
  }

  constructor(
    private readonly ndaPdfService: NdaPdfService,
    private readonly emailService: TrustEmailService,
    private readonly attachmentsService: AttachmentsService,
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
    friendlyUrl: string,
    dto: CreateAccessRequestDto,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ) {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      include: { organization: true },
    });

    if (!trust || trust.status !== 'published') {
      throw new NotFoundException('Trust site not found or not published');
    }

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
          scopes: existingGrant.scopes,
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
        requestedScopes: dto.requestedScopes,
        status: 'under_review',
        ipAddress,
        userAgent,
      },
    });

    return {
      id: request.id,
      status: request.status,
      message: 'Access request submitted for review',
    };
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
    const scopes = (dto.scopes?.length ? dto.scopes : request.requestedScopes) ?? [];

    if (!scopes.length) {
      throw new BadRequestException('At least one scope must be selected');
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
          requestedScopes: scopes,
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
            scopes,
            durationDays,
          },
        },
      });

      return { request: updatedRequest, ndaAgreement, scopes, durationDays };
    });

    const ndaSigningLink = `${this.TRUST_APP_URL}/nda/${result.ndaAgreement.signToken}`;

    await this.emailService.sendNdaSigningEmail({
      toEmail: request.email,
      toName: request.name,
      organizationName: request.organization.name,
      ndaSigningLink,
      scopes: result.scopes,
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
      },
    });

    if (!nda) {
      throw new NotFoundException('NDA agreement not found');
    }

    if (nda.signTokenExpiresAt < new Date()) {
      throw new BadRequestException('NDA signing link has expired');
    }

    if (nda.status === 'void') {
      throw new BadRequestException('This NDA has been revoked and is no longer valid');
    }

    if (nda.status !== 'pending') {
      throw new BadRequestException('NDA has already been signed');
    }

    return {
      id: nda.id,
      organizationName: nda.accessRequest.organization.name,
      requesterName: nda.accessRequest.name,
      requesterEmail: nda.accessRequest.email,
      scopes: nda.accessRequest.requestedScopes,
      expiresAt: nda.signTokenExpiresAt,
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
      throw new BadRequestException('This NDA has been revoked and is no longer valid');
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
        scopes: nda.grant.scopes,
        expiresAt: nda.grant.expiresAt,
      };
    }

    if (nda.status !== 'pending') {
      throw new BadRequestException('NDA has already been signed');
    }

    const scopes = nda.accessRequest.requestedScopes;
    if (!scopes?.length) {
      throw new BadRequestException('Cannot sign NDA: request has no scopes');
    }

    const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
      organizationName: nda.accessRequest.organization.name,
      scopes: nda.accessRequest.requestedScopes,
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
          scopes: nda.accessRequest.requestedScopes,
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
      scopes: result.grant.scopes,
      expiresAt: result.grant.expiresAt,
      portalUrl,
    });

    const pdfUrl = await this.ndaPdfService.getSignedUrl(pdfKey);

    return {
      message: 'NDA signed successfully',
      grant: result.grant,
      pdfDownloadUrl: pdfUrl,
      portalUrl,
      scopes: result.grant.scopes,
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
      scopes: request.requestedScopes,
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
      scopes: request.requestedScopes,
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
      scopes: nda.accessRequest.requestedScopes,
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

  async reclaimAccess(friendlyUrl: string, email: string) {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      include: { organization: true },
    });

    if (!trust || trust.status !== 'published') {
      throw new NotFoundException('Trust site not found or not published');
    }

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

    const accessLink = `${this.TRUST_APP_URL}/${friendlyUrl}/access/${accessToken}`;

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
      scopes: grant.scopes,
      expiresAt: grant.expiresAt,
      subjectEmail: grant.subjectEmail,
      ndaPdfUrl,
    };
  }

  async getDocumentsByAccessToken(token: string) {
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

    const documents = await db.trustDocument.findMany({
      where: {
        organizationId: grant.accessRequest.organizationId,
        isActive: true,
        scopes: {
          hasSome: grant.scopes,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        s3Key: true,
        scopes: true,
      },
    });

    return documents;
  }

  async downloadDocumentByAccessToken(token: string, documentId: string) {
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

    const document = await db.trustDocument.findFirst({
      where: {
        id: documentId,
        organizationId: grant.accessRequest.organizationId,
        isActive: true,
        scopes: {
          hasSome: grant.scopes,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or access denied');
    }

    const downloadUrl = await this.attachmentsService.getPresignedDownloadUrl(
      document.s3Key,
    );

    return {
      name: document.name,
      downloadUrl,
    };
  }
}
