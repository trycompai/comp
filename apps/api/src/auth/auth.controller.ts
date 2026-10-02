import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExcludeController,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { db } from '@db';
import { OrganizationId } from './auth-context.decorator';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';
import { AuthContext } from './auth-context.decorator';
import { HybridAuthGuard } from './hybrid-auth.guard';
import { SkipOrgCheck } from './skip-org-check.decorator';
import { resolveRolePermissions } from './app-access';
import type { AuthContext as AuthContextType } from './types';

@ApiExcludeController()
@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class AuthController {
  @Get('task-status-access')
  @UseGuards(PermissionGuard)
  @ApiOperation({
    summary: 'Get current member access for task status',
    description:
      'Resolve the current session member’s live organization and read permissions before accessing private background task output.',
  })
  async getTaskStatusAccess(@AuthContext() context: AuthContextType) {
    // This is a self-access check, not a lookup of caller-supplied roles.
    if (
      context.authType !== 'session' ||
      !context.userId ||
      !context.organizationId
    ) {
      throw new ForbiddenException('Session membership required');
    }

    const member = await db.member.findFirst({
      where: {
        userId: context.userId,
        organizationId: context.organizationId,
        isActive: true,
        deactivated: false,
      },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException('Active membership required');

    const roles = (member.role ?? '')
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
    const permissions = await resolveRolePermissions(
      context.organizationId,
      roles,
    );
    return { organizationId: context.organizationId, permissions };
  }

  @Get('me')
  @SkipOrgCheck()
  @ApiOperation({
    summary: 'Get current user info, organizations, and pending invitations',
  })
  async getMe(@AuthContext() authContext: AuthContextType) {
    const userId = authContext.userId;
    if (!userId) {
      return { user: null, organizations: [], pendingInvitation: null };
    }

    const [user, memberships, pendingInvitation, inactiveMembershipCount] =
      await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
          },
        }),
        db.member.findMany({
          where: { userId, isActive: true, deactivated: false },
          select: {
            id: true,
            role: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
                logo: true,
                onboardingCompleted: true,
                hasAccess: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        db.invitation.findFirst({
          where: {
            email: authContext.userEmail ?? '',
            status: 'pending',
          },
          select: { id: true },
        }),
        // Count memberships that exist but are no longer active (deactivated
        // or removed). Lets the app tell a genuinely new user (no memberships
        // at all → onboarding) apart from an offboarded user whose access was
        // revoked (→ "access removed" instead of a spurious new org). CS-569.
        db.member.count({
          where: {
            userId,
            OR: [{ deactivated: true }, { isActive: false }],
          },
        }),
      ]);

    return {
      user,
      organizations: memberships.map((m) => ({
        ...m.organization,
        memberRole: m.role,
        memberId: m.id,
      })),
      pendingInvitation,
      hasInactiveMembership: inactiveMembershipCount > 0,
    };
  }

  @Get('invitations')
  @UseGuards(PermissionGuard)
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'List pending invitations for the organization' })
  async listInvitations(@OrganizationId() organizationId: string) {
    const invitations = await db.invitation.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { email: 'asc' },
    });

    return { data: invitations };
  }

  @Delete('invitations/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('member', 'delete')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  async deleteInvitation(
    @Param('id') invitationId: string,
    @OrganizationId() organizationId: string,
  ) {
    const invitation = await db.invitation.findFirst({
      where: { id: invitationId, organizationId, status: 'pending' },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already accepted.');
    }

    await db.invitation.delete({ where: { id: invitationId } });

    return { success: true };
  }
}
