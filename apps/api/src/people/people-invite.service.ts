import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '@db';
import { triggerEmail } from '../email/trigger-email';
import { InviteEmail } from '../email/templates/invite-member';
import { InvitePortalEmail } from '@trycompai/email';
import type { InviteItemDto } from './dto/invite-people.dto';
import { checkAutoCompletePhases } from '../frameworks/frameworks-timeline.helper';
import { TimelinesService } from '../timelines/timelines.service';

export interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
  emailSent?: boolean;
}

@Injectable()
export class PeopleInviteService {
  private readonly logger = new Logger(PeopleInviteService.name);

  constructor(private readonly timelinesService: TimelinesService) {}

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
        const isPrivileged = invite.roles.some((role) =>
          ['admin', 'owner', 'auditor'].includes(role),
        );
        const isEmployee = invite.roles.some((role) =>
          ['employee', 'contractor'].includes(role),
        );
        const isStrictlyEmployee = isEmployee && !isPrivileged;

        const shouldSendPortalEmail =
          !!invite.sendPortalEmail && isStrictlyEmployee;

        if (isStrictlyEmployee) {
          const result = await this.addEmployeeWithoutInvite(
            email,
            invite.roles,
            organizationId,
            shouldSendPortalEmail,
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
            shouldSendPortalEmail,
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

    // Check timeline auto-completion after inviting members (people metrics may change)
    const hasSuccessfulInvites = results.some((r) => r.success);
    if (hasSuccessfulInvites) {
      checkAutoCompletePhases({
        organizationId,
        timelinesService: this.timelinesService,
      }).catch((err) => {
        this.logger.warn('timeline auto-complete check failed', err);
      });
    }

    return results;
  }

  private async addEmployeeWithoutInvite(
    email: string,
    roles: string[],
    organizationId: string,
    sendPortalEmail?: boolean,
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
      if (existingMember.deactivated || !existingMember.isActive) {
        const roleString = [...roles].sort().join(',');
        member = await db.member.update({
          where: { id: existingMember.id },
          data: { deactivated: false, isActive: true, role: roleString },
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

    if (member && isNewMember) {
      await this.createTrainingVideoEntries(member.id, organizationId);
    }

    // Send invite email (non-fatal)
    let emailSent = true;
    try {
      if (sendPortalEmail) {
        const inviteLink = this.buildPortalUrl(organizationId);
        await triggerEmail({
          to: email,
          subject: `You've been invited to join ${organization.name} on Comp AI`,
          react: InvitePortalEmail({
            organizationName: organization.name,
            inviteLink,
            email,
          }),
        });
      } else {
        const inviteLink = this.buildPortalUrl(organizationId);
        await triggerEmail({
          to: email,
          subject: `You've been invited to join ${organization.name} on Comp AI`,
          react: InviteEmail({ organizationName: organization.name, inviteLink }),
        });
      }
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
    sendPortalEmail?: boolean,
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
          sendPortalEmail,
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

    if (sendPortalEmail) {
      const inviteLink = this.buildPortalUrl(organizationId);
      await triggerEmail({
        to: email,
        subject: `You've been invited to join ${organization.name} on Comp AI`,
        react: InvitePortalEmail({
          organizationName: organization.name,
          inviteLink,
          email,
        }),
      });
    } else {
      const inviteLink = this.buildInviteLink(invitation.id);
      await triggerEmail({
        to: email,
        subject: `You've been invited to join ${organization.name} on Comp AI`,
        react: InviteEmail({ organizationName: organization.name, inviteLink }),
      });
    }
  }

  private async sendInvitationEmailToExistingMember(
    email: string,
    roles: string[],
    organizationId: string,
    inviterId: string,
    sendPortalEmail?: boolean,
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

    if (sendPortalEmail) {
      const inviteLink = this.buildPortalUrl(organizationId);
      await triggerEmail({
        to: email.toLowerCase(),
        subject: `You've been invited to join ${organization.name} on Comp AI`,
        react: InvitePortalEmail({
          organizationName: organization.name,
          inviteLink,
          email: email.toLowerCase(),
        }),
      });
    } else {
      const inviteLink = this.buildInviteLink(invitation.id);
      await triggerEmail({
        to: email.toLowerCase(),
        subject: `You've been invited to join ${organization.name} on Comp AI`,
        react: InviteEmail({ organizationName: organization.name, inviteLink }),
      });
    }
  }

  async resendPortalInvite(params: {
    organizationId: string;
    memberId: string;
  }): Promise<{ success: boolean }> {
    const { organizationId, memberId } = params;

    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
      include: { user: true, organization: { select: { name: true } } },
    });

    if (!member) {
      throw new BadRequestException('Member not found.');
    }

    const roles = member.role.split(',').map((r) => r.trim());
    const isPrivileged = roles.some((role) =>
      ['admin', 'owner', 'auditor'].includes(role),
    );
    const isEmployee = roles.some((role) =>
      ['employee', 'contractor'].includes(role),
    );
    if (!isEmployee || isPrivileged) {
      throw new BadRequestException(
        'Portal invites can only be sent to employee or contractor members.',
      );
    }

    const email = member.user.email;
    const inviteLink = this.buildPortalUrl(organizationId);

    await triggerEmail({
      to: email,
      subject: `Access your ${member.organization.name} Employee Portal on Comp AI`,
      react: InvitePortalEmail({
        organizationName: member.organization.name,
        inviteLink,
        email,
      }),
    });

    return { success: true };
  }

  private async createTrainingVideoEntries(
    memberId: string,
    organizationId?: string,
  ): Promise<void> {
    const trainingVideoIds = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];

    if (organizationId) {
      const hipaaInstance = await db.frameworkInstance.findFirst({
        where: { organizationId, framework: { name: 'HIPAA' } },
        select: { id: true },
      });
      if (hipaaInstance) {
        trainingVideoIds.push('hipaa-sat-1');
      }
    }

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
