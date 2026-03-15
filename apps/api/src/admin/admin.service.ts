import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';

interface PaginationParams {
  limit: number;
  offset: number;
}

interface AuditLogParams extends PaginationParams {
  orgId?: string;
  entityType?: string;
}

@Injectable()
export class AdminService {
  async getStats() {
    const [
      organizations,
      users,
      members,
      controls,
      policies,
      risks,
      vendors,
      tasks,
      frameworks,
      findings,
    ] = await Promise.all([
      db.organization.count(),
      db.user.count(),
      db.member.count(),
      db.control.count(),
      db.policy.count(),
      db.risk.count(),
      db.vendor.count(),
      db.task.count(),
      db.frameworkInstance.count(),
      db.finding.count(),
    ]);

    return {
      organizations,
      users,
      members,
      controls,
      policies,
      risks,
      vendors,
      tasks,
      frameworks,
      findings,
    };
  }

  async listOrgs({ limit, offset }: PaginationParams) {
    const [data, count] = await Promise.all([
      db.organization.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
              frameworkInstances: true,
            },
          },
        },
      }),
      db.organization.count(),
    ]);

    return { data, count };
  }

  async searchOrgs(query: string) {
    if (!query || query.length < 2) {
      return { data: [] };
    }

    // Search by org name, slug, or member email
    const data = await db.organization.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } },
          {
            members: {
              some: {
                user: { email: { contains: query, mode: 'insensitive' } },
              },
            },
          },
        ],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true, frameworkInstances: true },
        },
      },
    });

    return { data };
  }

  async getOrg(id: string) {
    const org = await db.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            frameworkInstances: true,
            controls: true,
            policy: true,
            risk: true,
            vendors: true,
            tasks: true,
            findings: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return org;
  }

  async listUsers({ limit, offset }: PaginationParams) {
    const [data, count] = await Promise.all([
      db.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          isPlatformAdmin: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: { members: true, sessions: true },
          },
        },
      }),
      db.user.count(),
    ]);

    return { data, count };
  }

  async searchUsers(email: string) {
    if (!email || email.length < 2) {
      return { data: [] };
    }

    const data = await db.user.findMany({
      where: {
        email: { contains: email, mode: 'insensitive' },
      },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        isPlatformAdmin: true,
        createdAt: true,
        lastLogin: true,
        members: {
          select: {
            id: true,
            role: true,
            deactivated: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return { data };
  }

  async getUser(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isPlatformAdmin: true,
        createdAt: true,
        lastLogin: true,
        members: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            organization: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async togglePlatformAdmin(id: string) {
    return db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: { id: true, isPlatformAdmin: true },
      });

      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }

      // Prevent removing the last platform admin
      if (user.isPlatformAdmin) {
        const adminCount = await tx.user.count({
          where: { isPlatformAdmin: true },
        });
        if (adminCount <= 1) {
          throw new BadRequestException(
            'Cannot demote the last platform admin. Promote another user first.',
          );
        }
      }

      return tx.user.update({
        where: { id },
        data: { isPlatformAdmin: !user.isPlatformAdmin },
        select: {
          id: true,
          email: true,
          isPlatformAdmin: true,
        },
      });
    });
  }

  async getAuditLogs({ orgId, entityType, limit, offset }: AuditLogParams) {
    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (entityType) where.entityType = entityType;

    const [data, count] = await Promise.all([
      db.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          timestamp: true,
          organizationId: true,
          userId: true,
          memberId: true,
          description: true,
          entityId: true,
          entityType: true,
          data: true,
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return { data, count };
  }
}
