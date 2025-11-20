"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustAccessService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const crypto_1 = require("crypto");
const trust_access_dto_1 = require("./dto/trust-access.dto");
const email_service_1 = require("./email.service");
const nda_pdf_service_1 = require("./nda-pdf.service");
const attachments_service_1 = require("../attachments/attachments.service");
const policy_pdf_renderer_service_1 = require("./policy-pdf-renderer.service");
let TrustAccessService = class TrustAccessService {
    ndaPdfService;
    emailService;
    attachmentsService;
    pdfRendererService;
    TRUST_APP_URL = process.env.TRUST_APP_URL ||
        process.env.BASE_URL ||
        'http://localhost:3008';
    generateToken(length) {
        return (0, crypto_1.randomBytes)(length).toString('base64url').slice(0, length);
    }
    constructor(ndaPdfService, emailService, attachmentsService, pdfRendererService) {
        this.ndaPdfService = ndaPdfService;
        this.emailService = emailService;
        this.attachmentsService = attachmentsService;
        this.pdfRendererService = pdfRendererService;
        if (!process.env.TRUST_APP_URL &&
            !process.env.BASE_URL &&
            process.env.NODE_ENV === 'production') {
            throw new Error('TRUST_APP_URL or BASE_URL must be set in production');
        }
    }
    async getMemberIdFromUserId(userId, organizationId) {
        const member = await db_1.db.member.findFirst({
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
    async createAccessRequest(friendlyUrl, dto, ipAddress, userAgent) {
        const trust = await db_1.db.trust.findUnique({
            where: { friendlyUrl },
            include: { organization: true },
        });
        if (!trust || trust.status !== 'published') {
            throw new common_1.NotFoundException('Trust site not found or not published');
        }
        const existingGrant = await db_1.db.trustAccessGrant.findFirst({
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
        const existingRequest = await db_1.db.trustAccessRequest.findFirst({
            where: {
                organizationId: trust.organizationId,
                email: dto.email,
                status: 'under_review',
            },
        });
        if (existingRequest) {
            throw new common_1.BadRequestException('You already have a pending request for this organization');
        }
        const request = await db_1.db.trustAccessRequest.create({
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
        return {
            id: request.id,
            status: request.status,
            message: 'Access request submitted for review',
        };
    }
    async listAccessRequests(organizationId, dto) {
        const where = {
            organizationId,
            ...(dto.status && { status: dto.status }),
        };
        const requests = await db_1.db.trustAccessRequest.findMany({
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
    async getAccessRequest(organizationId, requestId) {
        const request = await db_1.db.trustAccessRequest.findFirst({
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
            throw new common_1.NotFoundException('Access request not found');
        }
        return request;
    }
    async approveRequest(organizationId, requestId, dto, memberId) {
        const request = await db_1.db.trustAccessRequest.findFirst({
            where: {
                id: requestId,
                organizationId,
            },
            include: {
                organization: true,
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Access request not found');
        }
        if (request.status !== 'under_review') {
            throw new common_1.BadRequestException(`Request is already ${request.status}, cannot approve`);
        }
        const durationDays = dto.durationDays || request.requestedDurationDays || 30;
        const member = memberId
            ? await db_1.db.member.findFirst({
                where: { id: memberId, organizationId },
                select: { id: true, userId: true },
            })
            : null;
        if (!member) {
            throw new common_1.BadRequestException('Invalid member ID');
        }
        const signToken = this.generateToken(32);
        const signTokenExpiresAt = new Date();
        signTokenExpiresAt.setDate(signTokenExpiresAt.getDate() + 7);
        const result = await db_1.db.$transaction(async (tx) => {
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
    async denyRequest(organizationId, requestId, dto, memberId) {
        const request = await db_1.db.trustAccessRequest.findFirst({
            where: {
                id: requestId,
                organizationId,
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Access request not found');
        }
        if (request.status !== 'under_review') {
            throw new common_1.BadRequestException(`Request is already ${request.status}, cannot deny`);
        }
        const member = memberId
            ? await db_1.db.member.findFirst({
                where: { id: memberId, organizationId },
                select: { id: true, userId: true },
            })
            : null;
        if (!member) {
            throw new common_1.BadRequestException('Invalid member ID');
        }
        const updatedRequest = await db_1.db.trustAccessRequest.update({
            where: { id: requestId },
            data: {
                status: 'denied',
                reviewerMemberId: member.id,
                reviewedAt: new Date(),
                decisionReason: dto.reason,
            },
        });
        await db_1.db.auditLog.create({
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
    async listGrants(organizationId) {
        const grants = await db_1.db.trustAccessGrant.findMany({
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
    async revokeGrant(organizationId, grantId, dto, memberId) {
        const grant = await db_1.db.trustAccessGrant.findFirst({
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
            throw new common_1.NotFoundException('Grant not found');
        }
        if (grant.status !== 'active') {
            throw new common_1.BadRequestException(`Grant is already ${grant.status}`);
        }
        const member = memberId
            ? await db_1.db.member.findFirst({
                where: { id: memberId, organizationId },
                select: { id: true, userId: true },
            })
            : null;
        if (!member) {
            throw new common_1.BadRequestException('Invalid member ID');
        }
        const updatedGrant = await db_1.db.trustAccessGrant.update({
            where: { id: grantId },
            data: {
                status: 'revoked',
                revokedAt: new Date(),
                revokedByMemberId: member.id,
                revokeReason: dto.reason,
            },
        });
        await db_1.db.trustNDAAgreement.updateMany({
            where: { grantId },
            data: { status: 'void' },
        });
        await db_1.db.auditLog.create({
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
    async getNdaByToken(token) {
        const nda = await db_1.db.trustNDAAgreement.findUnique({
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
            throw new common_1.NotFoundException('NDA agreement not found');
        }
        if (nda.signTokenExpiresAt < new Date()) {
            throw new common_1.BadRequestException('NDA signing link has expired');
        }
        if (nda.status === 'void') {
            throw new common_1.BadRequestException('This NDA has been revoked and is no longer valid');
        }
        if (nda.status !== 'pending') {
            throw new common_1.BadRequestException('NDA has already been signed');
        }
        return {
            id: nda.id,
            organizationName: nda.accessRequest.organization.name,
            requesterName: nda.accessRequest.name,
            requesterEmail: nda.accessRequest.email,
            expiresAt: nda.signTokenExpiresAt,
        };
    }
    async signNda(token, signerName, signerEmail, ipAddress, userAgent) {
        const nda = await db_1.db.trustNDAAgreement.findUnique({
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
            throw new common_1.NotFoundException('NDA agreement not found');
        }
        if (nda.signTokenExpiresAt < new Date()) {
            throw new common_1.BadRequestException('NDA signing link has expired');
        }
        if (nda.status === 'void') {
            throw new common_1.BadRequestException('This NDA has been revoked and is no longer valid');
        }
        if (nda.status === 'signed' && nda.grant) {
            const pdfUrl = nda.pdfSignedKey
                ? await this.ndaPdfService.getSignedUrl(nda.pdfSignedKey)
                : null;
            const accessToken = nda.grant.accessToken || this.generateToken(32);
            const accessTokenExpiresAt = nda.grant.accessTokenExpiresAt ||
                new Date(Date.now() + 24 * 60 * 60 * 1000);
            if (!nda.grant.accessToken) {
                await db_1.db.trustAccessGrant.update({
                    where: { id: nda.grant.id },
                    data: { accessToken, accessTokenExpiresAt },
                });
            }
            const trust = await db_1.db.trust.findUnique({
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
            throw new common_1.BadRequestException('NDA has already been signed');
        }
        const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
            organizationName: nda.accessRequest.organization.name,
            signerName,
            signerEmail,
            agreementId: nda.id,
        });
        const pdfKey = await this.ndaPdfService.uploadNdaPdf(nda.organizationId, nda.id, pdfBuffer);
        const durationDays = nda.accessRequest.requestedDurationDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
        const accessToken = this.generateToken(32);
        const accessTokenExpiresAt = new Date();
        accessTokenExpiresAt.setHours(accessTokenExpiresAt.getHours() + 24);
        const result = await db_1.db.$transaction(async (tx) => {
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
        const trust = await db_1.db.trust.findUnique({
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
    async resendNda(organizationId, requestId) {
        const request = await db_1.db.trustAccessRequest.findFirst({
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
            throw new common_1.NotFoundException('Access request not found');
        }
        if (request.status !== 'approved') {
            throw new common_1.BadRequestException('Request must be approved first');
        }
        const pendingNda = request.ndaAgreements[0];
        if (!pendingNda) {
            throw new common_1.BadRequestException('No pending NDA agreement found');
        }
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);
        await db_1.db.trustNDAAgreement.update({
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
    async previewNda(organizationId, requestId) {
        const request = await db_1.db.trustAccessRequest.findFirst({
            where: {
                id: requestId,
                organizationId,
            },
            include: {
                organization: true,
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Access request not found');
        }
        const previewId = this.generateToken(16);
        const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
            organizationName: request.organization.name,
            signerName: request.name,
            signerEmail: request.email,
            agreementId: `preview-${previewId}`,
        });
        const fileName = `preview-nda-${requestId}-${Date.now()}.pdf`;
        const s3Key = await this.attachmentsService.uploadToS3(pdfBuffer, fileName, 'application/pdf', organizationId, 'trust_nda', `preview-${previewId}`);
        const pdfUrl = await this.ndaPdfService.getSignedUrl(s3Key);
        return {
            message: 'Preview NDA generated',
            previewId,
            s3Key,
            pdfDownloadUrl: pdfUrl,
        };
    }
    async previewNdaByToken(token) {
        const nda = await db_1.db.trustNDAAgreement.findUnique({
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
            throw new common_1.NotFoundException('NDA not found or token expired');
        }
        if (nda.signTokenExpiresAt < new Date()) {
            throw new common_1.BadRequestException('NDA signing link has expired');
        }
        const previewId = this.generateToken(16);
        const pdfBuffer = await this.ndaPdfService.generateNdaPdf({
            organizationName: nda.accessRequest.organization.name,
            signerName: nda.accessRequest.name,
            signerEmail: nda.accessRequest.email,
            agreementId: `preview-${previewId}`,
        });
        const fileName = `preview-nda-${nda.id}-${Date.now()}.pdf`;
        const s3Key = await this.attachmentsService.uploadToS3(pdfBuffer, fileName, 'application/pdf', nda.organizationId, 'trust_nda', `preview-${previewId}`);
        const pdfUrl = await this.ndaPdfService.getSignedUrl(s3Key);
        return {
            message: 'Preview NDA generated',
            previewId,
            s3Key,
            pdfDownloadUrl: pdfUrl,
        };
    }
    async reclaimAccess(friendlyUrl, email) {
        const trust = await db_1.db.trust.findUnique({
            where: { friendlyUrl },
            include: { organization: true },
        });
        if (!trust || trust.status !== 'published') {
            throw new common_1.NotFoundException('Trust site not found or not published');
        }
        const grant = await db_1.db.trustAccessGrant.findFirst({
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
            throw new common_1.NotFoundException('No active access grant found for this email');
        }
        let accessToken = grant.accessToken;
        let accessTokenExpiresAt = grant.accessTokenExpiresAt;
        if (!accessToken ||
            !accessTokenExpiresAt ||
            accessTokenExpiresAt < new Date()) {
            accessToken = this.generateToken(32);
            accessTokenExpiresAt = new Date();
            accessTokenExpiresAt.setHours(accessTokenExpiresAt.getHours() + 24);
            await db_1.db.trustAccessGrant.update({
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
    async getGrantByAccessToken(token) {
        const grant = await db_1.db.trustAccessGrant.findUnique({
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
            throw new common_1.NotFoundException('Invalid access token');
        }
        if (grant.status !== 'active') {
            throw new common_1.BadRequestException('Access grant is not active');
        }
        if (grant.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Access grant has expired');
        }
        if (!grant.accessTokenExpiresAt ||
            grant.accessTokenExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Access token has expired');
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
    async validateAccessToken(token) {
        const grant = await db_1.db.trustAccessGrant.findUnique({
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
            throw new common_1.NotFoundException('Invalid access token');
        }
        if (grant.status !== 'active') {
            throw new common_1.BadRequestException('Access grant is not active');
        }
        if (grant.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Access grant has expired');
        }
        if (!grant.accessTokenExpiresAt ||
            grant.accessTokenExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Access token has expired');
        }
        return grant;
    }
    async getPoliciesByAccessToken(token) {
        const grant = await db_1.db.trustAccessGrant.findUnique({
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
            throw new common_1.NotFoundException('Invalid access token');
        }
        if (grant.status !== 'active') {
            throw new common_1.BadRequestException('Access grant is not active');
        }
        if (grant.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Access grant has expired');
        }
        if (!grant.accessTokenExpiresAt ||
            grant.accessTokenExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Access token has expired');
        }
        const policies = await db_1.db.policy.findMany({
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
    async downloadAllPoliciesByAccessToken(token) {
        const grant = await this.validateAccessToken(token);
        const policies = await db_1.db.policy.findMany({
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
            throw new common_1.NotFoundException('No published policies available');
        }
        const pdfBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(policies.map((p) => ({
            name: p.name,
            content: p.content,
        })), grant.accessRequest.organization.name);
        const bundleDocId = `bundle-${grant.id}-${Date.now()}`;
        const watermarked = await this.ndaPdfService.watermarkExistingPdf(pdfBuffer, {
            name: grant.accessRequest.name,
            email: grant.subjectEmail,
            docId: bundleDocId,
        });
        const key = await this.attachmentsService.uploadToS3(watermarked, `policies-bundle-grant-${grant.id}-${Date.now()}.pdf`, 'application/pdf', grant.accessRequest.organizationId, 'trust_policy_downloads', `${grant.id}`);
        const downloadUrl = await this.attachmentsService.getPresignedDownloadUrl(key);
        return { name: 'All Policies', downloadUrl };
    }
};
exports.TrustAccessService = TrustAccessService;
exports.TrustAccessService = TrustAccessService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [nda_pdf_service_1.NdaPdfService,
        email_service_1.TrustEmailService,
        attachments_service_1.AttachmentsService,
        policy_pdf_renderer_service_1.PolicyPdfRendererService])
], TrustAccessService);
//# sourceMappingURL=trust-access.service.js.map