import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AuditLogEntityType, db } from '@db';
import { triggerEmail } from '../email/trigger-email';
import { InviteEmail } from '../email/templates/invite-member';

@Injectable()
export class AdminOrganizationsService {
  private readonly logger = new Logger(AdminOrganizationsService.name);

  async listOrganizations(options: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const { search, page, limit } = options;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { id: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            {
              members: {
                some: {
                  role: { contains: 'owner' },
                  user: {
                    name: { contains: search, mode: 'insensitive' as const },
                  },
                },
              },
            },
            {
              members: {
                some: {
                  role: { contains: 'owner' },
                  user: {
                    email: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            },
          ],
        }
      : {};

    const [organizations, total] = await Promise.all([
      db.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
          hasAccess: true,
          onboardingCompleted: true,
          _count: { select: { members: true } },
          members: {
            where: { role: { contains: 'owner' } },
            take: 1,
            select: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.organization.count({ where }),
    ]);

    return {
      data: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        createdAt: org.createdAt,
        hasAccess: org.hasAccess,
        onboardingCompleted: org.onboardingCompleted,
        memberCount: org._count.members,
        owner: org.members[0]?.user ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  async getOrganization(id: string) {
    const org = await db.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
        hasAccess: true,
        onboardingCompleted: true,
        website: true,
        members: {
          where: { isActive: true, deactivated: false },
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return org;
  }

  async setAccess(id: string, hasAccess: boolean) {
    const org = await db.organization.findUnique({ where: { id } });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    await db.organization.update({
      where: { id },
      data: { hasAccess },
    });

    return { success: true };
  }

  private static readonly ALLOWED_INVITE_ROLES = [
    'admin',
    'auditor',
    'employee',
    'contractor',
  ];

  async inviteMember(params: {
    orgId: string;
    email: string;
    role: string;
    adminUserId: string;
  }) {
    const { orgId, email, role, adminUserId } = params;
    const normalizedEmail = email.toLowerCase().trim();

    if (!AdminOrganizationsService.ALLOWED_INVITE_ROLES.includes(role)) {
      throw new BadRequestException(
        `Invalid role. Must be one of: ${AdminOrganizationsService.ALLOWED_INVITE_ROLES.join(', ')}`,
      );
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    const existingUser = await db.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (existingUser) {
      const activeMember = await db.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: orgId,
          deactivated: false,
        },
      });

      if (activeMember) {
        throw new BadRequestException(
          'User is already an active member of this organization.',
        );
      }
    }

    await db.invitation.updateMany({
      where: {
        email: normalizedEmail,
        organizationId: orgId,
        status: 'pending',
      },
      data: { status: 'canceled' },
    });

    const invitation = await db.invitation.create({
      data: {
        email: normalizedEmail,
        organizationId: orgId,
        role,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: adminUserId,
      },
    });

    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const inviteLink = `${appUrl}/invite/${invitation.id}`;

      await triggerEmail({
        to: normalizedEmail,
        subject: `You've been invited to join ${org.name} on Comp AI`,
        react: InviteEmail({
          organizationName: org.name,
          inviteLink,
          email: normalizedEmail,
        }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send invite email to ${normalizedEmail}`,
        err instanceof Error ? err.message : 'Unknown error',
      );
    }

    return { success: true, invitationId: invitation.id };
  }

  async listInvitations(orgId: string) {
    const org = await db.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    return db.invitation.findMany({
      where: { organizationId: orgId, status: 'pending' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(orgId: string, invitationId: string) {
    const invitation = await db.invitation.findFirst({
      where: { id: invitationId, organizationId: orgId, status: 'pending' },
    });

    if (!invitation) {
      throw new NotFoundException(
        'Pending invitation not found. It may have already been accepted, rejected, or canceled.',
      );
    }

    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 'canceled' },
    });

    return { success: true };
  }

  async getAuditLogs(options: {
    orgId: string;
    entityType?: string;
    take?: string;
  }) {
    const { orgId, entityType, take } = options;

    const where: Record<string, unknown> = { organizationId: orgId };

    if (entityType) {
      const validEntityTypes = Object.values(AuditLogEntityType) as string[];
      const types = entityType
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const invalidTypes = types.filter((t) => !validEntityTypes.includes(t));
      if (invalidTypes.length > 0) {
        throw new BadRequestException(
          `Invalid entityType: ${invalidTypes.join(', ')}. Must be one of: ${validEntityTypes.join(', ')}`,
        );
      }
      where.entityType = types.length === 1 ? types[0] : { in: types };
    }

    const parsedTake = take
      ? Math.min(100, Math.max(1, parseInt(take, 10) || 100))
      : 100;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        member: true,
        organization: true,
      },
      orderBy: { timestamp: 'desc' },
      take: parsedTake,
    });

    return { data: logs };
  }
}
