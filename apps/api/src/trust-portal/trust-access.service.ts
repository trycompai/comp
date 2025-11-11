import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import {
  ApproveAccessRequestDto,
  CreateAccessRequestDto,
  DenyAccessRequestDto,
  ListAccessRequestsDto,
  RevokeGrantDto,
} from './dto/trust-access.dto';

@Injectable()
export class TrustAccessService {
  async createAccessRequest(
    friendlyUrl: string,
    dto: CreateAccessRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const trust = await db.trust.findUnique({
      where: { friendlyUrl },
      include: { organization: true },
    });

    if (!trust || trust.status !== 'published') {
      throw new NotFoundException('Trust site not found or not published');
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

    await db.auditLog.create({
      data: {
        organizationId: trust.organizationId,
        userId: 'system',
        entityType: 'trust',
        entityId: request.id,
        description: `Access request submitted by ${dto.email}`,
        data: {
          requestId: request.id,
          email: dto.email,
          requestedScopes: dto.requestedScopes,
        },
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    const scopes = dto.scopes || request.requestedScopes;

    const result = await db.$transaction(async (tx) => {
      const grant = await tx.trustAccessGrant.create({
        data: {
          accessRequestId: requestId,
          subjectEmail: request.email,
          scopes,
          expiresAt,
          issuedByMemberId: memberId,
        },
      });

      const updatedRequest = await db.trustAccessRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewerMemberId: memberId,
          reviewedAt: new Date(),
        },
      });

      await db.auditLog.create({
        data: {
          organizationId,
          userId: memberId || 'system',
          memberId,
          entityType: 'trust',
          entityId: requestId,
          description: `Access request approved for ${request.email}`,
          data: {
            requestId,
            grantId: grant.id,
            expiresAt: grant.expiresAt,
            scopes,
          },
        },
      });

      return { request: updatedRequest, grant };
    });

    return result;
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

    const updatedRequest = await db.trustAccessRequest.update({
      where: { id: requestId },
      data: {
        status: 'denied',
        reviewerMemberId: memberId,
        reviewedAt: new Date(),
        decisionReason: dto.reason,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId,
        userId: memberId || 'system',
        memberId,
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

    const updatedGrant = await db.trustAccessGrant.update({
      where: { id: grantId },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedByMemberId: memberId,
        revokeReason: dto.reason,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: grant.accessRequest.organizationId,
        userId: memberId || 'system',
        memberId,
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
}
