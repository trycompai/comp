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
import {
  BUILT_IN_ROLE_OBLIGATIONS,
  BUILT_IN_ROLE_PERMISSIONS,
  RESTRICTED_ROLES,
} from '@trycompai/auth';
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

    const callerMemberActions = await this.resolveCallerMemberActions(
      callerRole,
      organizationId,
    );
    const hasFullMemberControl = callerMemberActions.has('delete');

    const results: InviteResult[] = [];

    for (const invite of invites) {
      try {
        const roleError = this.validateAssignableRoles(
          invite.roles,
          hasFullMemberControl,
        );
        if (roleError) {
          results.push({ email: invite.email, success: false, error: roleError });
          continue;
        }

        const email = invite.email.toLowerCase();
        const restrictedRoles: readonly string[] = RESTRICTED_ROLES;
        const isStrictlyEmployee =
          invite.roles.every((role) => restrictedRoles.includes(role));

        const hasCompliance = await this.rolesHaveComplianceObligation(
          invite.roles,
          organizationId,
        );
        const shouldSendPortalEmail =
          !!invite.sendPortalEmail && hasCompliance;

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
    const hasCompliance = await this.rolesHaveComplianceObligation(
      roles,
      organizationId,
    );
    if (!hasCompliance) {
      throw new BadRequestException(
        'Portal invites can only be sent to members with compliance obligations.',
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

  private async rolesHaveComplianceObligation(
    roles: string[],
    organizationId: string,
  ): Promise<boolean> {
    for (const role of roles) {
      if (BUILT_IN_ROLE_OBLIGATIONS[role]?.compliance) return true;
    }

    const customRoleNames = roles.filter((r) => !BUILT_IN_ROLE_OBLIGATIONS[r]);
    if (customRoleNames.length === 0) return false;

    const customRoles = await db.organizationRole.findMany({
      where: {
        organizationId,
        name: { in: customRoleNames },
      },
      select: { obligations: true },
    });

    return customRoles.some((role) => {
      const obligations =
        typeof role.obligations === 'string'
          ? JSON.parse(role.obligations)
          : role.obligations || {};
      return !!obligations.compliance;
    });
  }

  private validateAssignableRoles(
    targetRoles: string[],
    callerHasFullControl: boolean,
  ): string | null {
    if (callerHasFullControl) return null;

    const restrictedSet: readonly string[] = RESTRICTED_ROLES;
    const privileged = targetRoles.filter(
      (r) => !restrictedSet.includes(r) && Object.hasOwn(BUILT_IN_ROLE_PERMISSIONS, r),
    );
    if (privileged.length > 0) {
      return `You cannot assign privileged roles: ${privileged.join(', ')}.`;
    }
    return null;
  }

  private async resolveCallerMemberActions(
    callerRole: string,
    organizationId: string,
  ): Promise<Set<string>> {
    const roles = callerRole.split(',').map((r) => r.trim());
    const actions = new Set<string>();
    const customRoleNames: string[] = [];

    for (const role of roles) {
      const builtIn = BUILT_IN_ROLE_PERMISSIONS[role];
      if (builtIn?.member) {
        for (const a of builtIn.member) actions.add(a);
      }
      if (!builtIn) customRoleNames.push(role);
    }

    if (customRoleNames.length > 0) {
      const customRoles = await db.organizationRole.findMany({
        where: { organizationId, name: { in: customRoleNames } },
        select: { permissions: true },
      });
      for (const role of customRoles) {
        const perms =
          typeof role.permissions === 'string'
            ? JSON.parse(role.permissions)
            : role.permissions;
        if (Array.isArray(perms?.member)) {
          for (const a of perms.member) actions.add(a);
        }
      }
    }

    return actions;
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
