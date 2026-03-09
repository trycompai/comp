import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { triggerEmail } from '../email/trigger-email';
import { InviteEmail } from '../email/templates/invite-member';
import type { InviteItemDto } from './dto/invite-people.dto';

export interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

@Injectable()
export class PeopleInviteService {
  private readonly logger = new Logger(PeopleInviteService.name);

  async inviteMembers(params: {
    organizationId: string;
    invites: InviteItemDto[];
    callerUserId: string;
    callerRole: string;
  }): Promise<InviteResult[]> {
    const { organizationId, invites, callerUserId, callerRole } = params;

    const isAdmin =
      callerRole.includes('admin') || callerRole.includes('owner');
    const isAuditor = callerRole.includes('auditor');

    if (!isAdmin && !isAuditor) {
      throw new ForbiddenException(
        "You don't have permission to invite members.",
      );
    }

    const results: InviteResult[] = [];

    for (const invite of invites) {
      try {
        // Auditors can only invite auditors
        if (isAuditor && !isAdmin) {
          const onlyAuditor =
            invite.roles.length === 1 && invite.roles[0] === 'auditor';
          if (!onlyAuditor) {
            results.push({
              email: invite.email,
              success: false,
              error: "Auditors can only invite users with the 'auditor' role.",
            });
            continue;
          }
        }

        const email = invite.email.toLowerCase();
        const hasEmployeeRoleAndNoAdmin =
          !invite.roles.includes('admin') &&
          (invite.roles.includes('employee') ||
            invite.roles.includes('contractor'));

        if (hasEmployeeRoleAndNoAdmin) {
          const result = await this.addEmployeeWithoutInvite(
            email,
            invite.roles,
            organizationId,
          );
          results.push({
            email: invite.email,
            success: true,
            emailSent: result.emailSent,
          });
        } else {
          await this.inviteWithCheck(
            email,
            invite.roles,
            organizationId,
            callerUserId,
          );
          results.push({ email: invite.email, success: true });
        }
      } catch (error) {
        this.logger.error(
          `Failed to invite ${invite.email}:`,
          error instanceof Error ? error.message : 'Unknown error',
        );
        results.push({
          email: invite.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private async addEmployeeWithoutInvite(
    email: string,
    roles: string[],
    organizationId: string,
  ): Promise<{ emailSent: boolean }> {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found.');
    }

    let userId = '';
    const existingUser = await db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!existingUser) {
      const newUser = await db.user.create({
        data: { emailVerified: false, email, name: email.split('@')[0] },
      });
      userId = newUser.id;
    }

    const finalUserId = existingUser?.id ?? userId;

    const existingMember = await db.member.findFirst({
      where: { userId: finalUserId, organizationId },
    });

    let member: { id: string } | null = null;
    let isNewMember = false;

    if (existingMember) {
      if (existingMember.deactivated) {
        const roleString = [...roles].sort().join(',');
        member = await db.member.update({
          where: { id: existingMember.id },
          data: { deactivated: false, role: roleString },
        });
      } else {
        member = existingMember;
      }
    } else {
      member = await db.member.create({
        data: {
          userId: finalUserId,
          organizationId,
          role: roles.join(','),
          isActive: true,
        },
      });
      isNewMember = true;
    }

    // Create training video entries for new members
    if (member && isNewMember) {
      await this.createTrainingVideoEntries(member.id);
    }

    // Send invite email (non-fatal)
    let emailSent = true;
    try {
      const inviteLink = this.buildPortalUrl(organizationId);
      await triggerEmail({
        to: email,
        subject: `You've been invited to join ${organization.name} on Comp AI`,
        react: InviteEmail({ organizationName: organization.name, inviteLink }),
      });
    } catch (emailErr) {
      emailSent = false;
      this.logger.error(
        `Invite email failed after member was added: ${email}`,
        emailErr instanceof Error ? emailErr.message : 'Unknown error',
      );
    }

    return { emailSent };
  }

  private async inviteWithCheck(
    email: string,
    roles: string[],
    organizationId: string,
    currentUserId: string,
  ): Promise<void> {
    const existingUser = await db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existingUser) {
      const existingMember = await db.member.findFirst({
        where: { userId: existingUser.id, organizationId },
      });

      if (existingMember) {
        if (existingMember.deactivated) {
          const roleString = [...roles].sort().join(',');
          await db.member.update({
            where: { id: existingMember.id },
            data: { deactivated: false, isActive: true, role: roleString },
          });
          return;
        }

        // Active member — send invitation email
        await this.sendInvitationEmailToExistingMember(
          email,
          roles,
          organizationId,
          currentUserId,
        );
        return;
      }
    }

    // User doesn't exist or isn't a member — create invitation and send email
    const roleString = roles.join(',');
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found.');
    }

    const invitation = await db.invitation.create({
      data: {
        email,
        organizationId,
        role: roleString,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: currentUserId,
      },
    });

    const inviteLink = this.buildInviteLink(invitation.id);
    await triggerEmail({
      to: email,
      subject: `You've been invited to join ${organization.name} on Comp AI`,
      react: InviteEmail({ organizationName: organization.name, inviteLink }),
    });
  }

  private async sendInvitationEmailToExistingMember(
    email: string,
    roles: string[],
    organizationId: string,
    inviterId: string,
  ): Promise<void> {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new BadRequestException('Organization not found.');
    }

    const invitation = await db.invitation.create({
      data: {
        email: email.toLowerCase(),
        organizationId,
        role: roles.length === 1 ? roles[0] : roles.join(','),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId,
      },
    });

    const inviteLink = this.buildInviteLink(invitation.id);
    await triggerEmail({
      to: email.toLowerCase(),
      subject: `You've been invited to join ${organization.name} on Comp AI`,
      react: InviteEmail({ organizationName: organization.name, inviteLink }),
    });
  }

  private async createTrainingVideoEntries(memberId: string): Promise<void> {
    // Training videos are defined in the app; we create entries for known video IDs
    const trainingVideoIds = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];

    await db.employeeTrainingVideoCompletion.createMany({
      data: trainingVideoIds.map((videoId) => ({
        memberId,
        videoId,
      })),
      skipDuplicates: true,
    });
  }

  private buildPortalUrl(organizationId: string): string {
    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.trycomp.ai';
    return `${portalUrl}/${organizationId}`;
  }

  private buildInviteLink(invitationId: string): string {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      'https://app.trycomp.ai';
    return `${appUrl}/invite/${invitationId}`;
  }
}
