import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { db } from '@trycompai/db';
import { OrganizationId } from './auth-context.decorator';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './require-permission.decorator';
import { AuthContext } from './auth-context.decorator';
import { HybridAuthGuard } from './hybrid-auth.guard';
import type { AuthContext as AuthContextType } from './types';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: 'Get current user info, organizations, and pending invitations' })
  async getMe(@AuthContext() authContext: AuthContextType) {
    const userId = authContext.userId;
    if (!userId) {
      return { user: null, organizations: [], pendingInvitation: null };
    }

    const [user, memberships, pendingInvitation] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          isPlatformAdmin: true,
        },
      }),
      db.member.findMany({
        where: { userId, isActive: true },
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
          email: authContext.userEmail!,
          status: 'pending',
        },
        select: { id: true },
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
