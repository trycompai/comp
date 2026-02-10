import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import {
  isUserUnsubscribed,
  sendUnassignedItemsNotificationEmail,
  type UnassignedItem,
} from '@trycompai/email';
import { FleetService } from '../lib/fleet.service';
import type { PeopleResponseDto } from './dto/people-responses.dto';
import type { CreatePeopleDto } from './dto/create-people.dto';
import type { UpdatePeopleDto } from './dto/update-people.dto';
import type { BulkCreatePeopleDto } from './dto/bulk-create-people.dto';
import { MemberValidator } from './utils/member-validator';
import { MemberQueries } from './utils/member-queries';
import {
  getFleetComplianceForMember,
  getAllEmployeeDevices,
} from './people-fleet.helper';

@Injectable()
export class PeopleService {
  private readonly logger = new Logger(PeopleService.name);

  constructor(private readonly fleetService: FleetService) {}

  async findAllByOrganization(
    organizationId: string,
    includeDeactivated = false,
  ): Promise<PeopleResponseDto[]> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const members = await MemberQueries.findAllByOrganization(
        organizationId,
        includeDeactivated,
      );

      this.logger.log(
        `Retrieved ${members.length} members for organization ${organizationId}`,
      );
      return members;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve members for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to retrieve members');
    }
  }

  async findById(
    memberId: string,
    organizationId: string,
  ): Promise<PeopleResponseDto> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const member = await MemberQueries.findByIdInOrganization(
        memberId,
        organizationId,
      );

      if (!member) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      this.logger.log(`Retrieved member: ${member.user.name} (${memberId})`);
      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve member ${memberId} in organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to retrieve member');
    }
  }

  async create(
    organizationId: string,
    createData: CreatePeopleDto,
  ): Promise<PeopleResponseDto> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      await MemberValidator.validateUser(createData.userId);
      await MemberValidator.validateUserNotMember(
        createData.userId,
        organizationId,
      );

      const member = await MemberQueries.createMember(
        organizationId,
        createData,
      );

      this.logger.log(
        `Created member: ${member.user.name} (${member.id}) for organization ${organizationId}`,
      );
      return member;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create member for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to create member');
    }
  }

  async bulkCreate(
    organizationId: string,
    bulkCreateData: BulkCreatePeopleDto,
  ): Promise<{
    created: PeopleResponseDto[];
    errors: Array<{ index: number; userId: string; error: string }>;
    summary: { total: number; successful: number; failed: number };
  }> {
    try {
      await MemberValidator.validateOrganization(organizationId);

      const created: PeopleResponseDto[] = [];
      const errors: Array<{ index: number; userId: string; error: string }> =
        [];

      // Process each member in the bulk request
      // Validate all users and membership status first, collecting errors
      const validMembers: CreatePeopleDto[] = [];
      for (let i = 0; i < bulkCreateData.members.length; i++) {
        const memberData = bulkCreateData.members[i];
        try {
          await MemberValidator.validateUser(memberData.userId);
          await MemberValidator.validateUserNotMember(
            memberData.userId,
            organizationId,
          );
          validMembers.push(memberData);
        } catch (error) {
          errors.push({
            index: i,
            userId: memberData.userId,
            error: error.message || 'Unknown error occurred',
          });
          this.logger.error(
            `Failed to validate member at index ${i} (userId: ${memberData.userId}):`,
            error,
          );
        }
      }

      // Bulk insert valid members using createMany
      if (validMembers.length > 0) {
        const createdMembers = await MemberQueries.bulkCreateMembers(
          organizationId,
          validMembers,
        );

        created.push(...createdMembers);
        createdMembers.forEach((member) => {
          this.logger.log(
            `Created member: ${member.user.name} (${member.id}) for organization ${organizationId}`,
          );
        });
      }

      const summary = {
        total: bulkCreateData.members.length,
        successful: created.length,
        failed: errors.length,
      };

      this.logger.log(
        `Bulk create completed for organization ${organizationId}: ${summary.successful}/${summary.total} successful`,
      );

      return { created, errors, summary };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to bulk create members for organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to bulk create members');
    }
  }

  async updateById(
    memberId: string,
    organizationId: string,
    updateData: UpdatePeopleDto,
  ): Promise<PeopleResponseDto> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const existingMember = await MemberValidator.validateMemberExists(
        memberId,
        organizationId,
      );

      // If userId is being updated, validate the new user
      if (updateData.userId && updateData.userId !== existingMember.userId) {
        await MemberValidator.validateUser(updateData.userId);
        await MemberValidator.validateUserNotMember(
          updateData.userId,
          organizationId,
          memberId,
        );
      }

      const updatedMember = await MemberQueries.updateMember(
        memberId,
        updateData,
      );

      this.logger.log(
        `Updated member: ${updatedMember.user.name} (${memberId})`,
      );
      return updatedMember;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update member ${memberId} in organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to update member');
    }
  }

  async deleteById(
    memberId: string,
    organizationId: string,
    actorUserId?: string,
  ): Promise<{
    success: boolean;
    deletedMember: { id: string; name: string; email: string };
  }> {
    try {
      await MemberValidator.validateOrganization(organizationId);

      const member = await db.member.findFirst({
        where: { id: memberId, organizationId },
        include: { user: { select: { id: true, name: true, email: true, isPlatformAdmin: true } } },
      });

      if (!member) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      if (member.role.includes('owner')) {
        throw new ForbiddenException('Cannot remove the organization owner');
      }

      if (member.user.isPlatformAdmin) {
        throw new ForbiddenException('This member is managed by Comp AI and cannot be removed');
      }

      if (actorUserId && member.userId === actorUserId) {
        throw new ForbiddenException('You cannot remove yourself from the organization');
      }

      // Collect assigned items and clear assignments
      const unassignedItems = await this.collectAndClearAssignments(memberId, organizationId);

      // Remove FleetDM hosts
      await this.removeFleetHosts(member.fleetDmLabelId);

      // Deactivate member (soft delete)
      await db.member.update({
        where: { id: memberId },
        data: { deactivated: true, isActive: false },
      });

      // Delete user sessions
      await db.session.deleteMany({ where: { userId: member.userId } });

      this.logger.log(
        `Deactivated member: ${member.user.name} (${memberId}) from organization ${organizationId}`,
      );

      // Send unassigned items notification to owner (fire-and-forget)
      this.notifyOwnerOfUnassignedItems(organizationId, member.user.name || member.user.email, unassignedItems)
        .catch((err) => this.logger.error('Failed to send unassigned items notification:', err));

      return {
        success: true,
        deletedMember: {
          id: member.id,
          name: member.user.name,
          email: member.user.email,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete member ${memberId} from organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to delete member');
    }
  }

  private async collectAndClearAssignments(
    memberId: string,
    organizationId: string,
  ): Promise<UnassignedItem[]> {
    const [tasks, policies, risks, vendors] = await Promise.all([
      db.task.findMany({
        where: { assigneeId: memberId, organizationId },
        select: { id: true, title: true },
      }),
      db.policy.findMany({
        where: { assigneeId: memberId, organizationId },
        select: { id: true, name: true },
      }),
      db.risk.findMany({
        where: { assigneeId: memberId, organizationId },
        select: { id: true, title: true },
      }),
      db.vendor.findMany({
        where: { assigneeId: memberId, organizationId },
        select: { id: true, name: true },
      }),
    ]);

    const items: UnassignedItem[] = [
      ...tasks.map((t) => ({ type: 'task' as const, id: t.id, name: t.title })),
      ...policies.map((p) => ({ type: 'policy' as const, id: p.id, name: p.name })),
      ...risks.map((r) => ({ type: 'risk' as const, id: r.id, name: r.title })),
      ...vendors.map((v) => ({ type: 'vendor' as const, id: v.id, name: v.name })),
    ];

    // Clear all assignments
    await Promise.all([
      db.task.updateMany({ where: { assigneeId: memberId, organizationId }, data: { assigneeId: null } }),
      db.policy.updateMany({ where: { assigneeId: memberId, organizationId }, data: { assigneeId: null } }),
      db.risk.updateMany({ where: { assigneeId: memberId, organizationId }, data: { assigneeId: null } }),
      db.vendor.updateMany({ where: { assigneeId: memberId, organizationId }, data: { assigneeId: null } }),
    ]);

    return items;
  }

  private async removeFleetHosts(fleetDmLabelId: number | null): Promise<void> {
    if (!fleetDmLabelId) return;

    try {
      const result = await this.fleetService.removeHostsByLabel(fleetDmLabelId);
      this.logger.log(`Removed ${result.deletedCount} host(s) from FleetDM for label ${fleetDmLabelId}`);
    } catch (err) {
      this.logger.error(`Failed to remove FleetDM hosts for label ${fleetDmLabelId}:`, err);
    }
  }

  private async notifyOwnerOfUnassignedItems(
    organizationId: string,
    removedMemberName: string,
    unassignedItems: UnassignedItem[],
  ): Promise<void> {
    if (unassignedItems.length === 0) return;

    const [organization, owner] = await Promise.all([
      db.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      db.member.findFirst({
        where: { organizationId, role: { contains: 'owner' }, deactivated: false },
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);

    if (!owner || !organization) return;

    const unsubscribed = await isUserUnsubscribed(db, owner.user.email, 'unassignedItemsNotifications', organizationId);
    if (unsubscribed) return;

    await sendUnassignedItemsNotificationEmail({
      email: owner.user.email,
      userName: owner.user.name || owner.user.email,
      organizationName: organization.name,
      organizationId,
      removedMemberName,
      unassignedItems,
    });
  }

  async unlinkDevice(
    memberId: string,
    organizationId: string,
  ): Promise<PeopleResponseDto> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const existingMember = await MemberQueries.findByIdInOrganization(
        memberId,
        organizationId,
      );

      if (!existingMember) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      // Remove hosts from FleetDM before unlinking the device
      if (existingMember.fleetDmLabelId) {
        try {
          const removalResult = await this.fleetService.removeHostsByLabel(
            existingMember.fleetDmLabelId,
          );
          this.logger.log(
            `Removed ${removalResult.deletedCount} host(s) from FleetDM for label ${existingMember.fleetDmLabelId}`,
          );
          if (removalResult.failedCount > 0) {
            this.logger.warn(
              `Failed to remove ${removalResult.failedCount} host(s) from FleetDM`,
            );
          }
        } catch (fleetError) {
          // Log FleetDM error but don't fail the entire operation
          this.logger.error(
            `Failed to remove hosts from FleetDM for label ${existingMember.fleetDmLabelId}:`,
            fleetError,
          );
          // Continue with unlinking the device even if FleetDM removal fails
        }
      }

      const updatedMember = await MemberQueries.unlinkDevice(memberId);

      this.logger.log(
        `Unlinked device for member: ${updatedMember.user.name} (${memberId})`,
      );
      return updatedMember;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to unlink device for member ${memberId} in organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to unlink device');
    }
  }

  async removeHostById(
    memberId: string,
    organizationId: string,
    hostId: number,
  ): Promise<{ success: true }> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const member = await MemberQueries.findByIdInOrganization(
        memberId,
        organizationId,
      );

      if (!member) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      if (!member.fleetDmLabelId) {
        throw new BadRequestException(
          `Member ${memberId} has no Fleet label; cannot remove host`,
        );
      }

      const labelHosts = await this.fleetService.getHostsByLabel(
        member.fleetDmLabelId,
      );
      const hostIds = (labelHosts?.hosts ?? []).map(
        (host: { id: number }) => host.id,
      );
      if (!hostIds.includes(hostId)) {
        throw new NotFoundException(
          `Host ${hostId} not found for member ${memberId} in organization ${organizationId}`,
        );
      }

      await this.fleetService.removeHostById(hostId);

      this.logger.log(
        `Removed host ${hostId} from FleetDM for member ${memberId} in organization ${organizationId}`,
      );
      return { success: true };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to remove host ${hostId} for member ${memberId} in organization ${organizationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to remove host');
    }
  }

  async getTestStatsByAssignee(organizationId: string) {
    const members = await db.member.findMany({
      where: { organizationId, isActive: true },
      select: {
        user: {
          select: { id: true, name: true, image: true, email: true },
        },
      },
    });

    const userIds = members.map((m) => m.user.id);

    const integrationResults = await db.integrationResult.findMany({
      where: {
        organizationId,
        assignedUserId: { in: userIds },
      },
      select: { status: true, assignedUserId: true },
    });

    const resultsByUser = new Map<string, { status: string }[]>();
    for (const result of integrationResults) {
      if (result.assignedUserId) {
        if (!resultsByUser.has(result.assignedUserId)) {
          resultsByUser.set(result.assignedUserId, []);
        }
        resultsByUser.get(result.assignedUserId)!.push({
          status: result.status || '',
        });
      }
    }

    return members
      .filter((m) => resultsByUser.has(m.user.id))
      .map((m) => {
        const tests = resultsByUser.get(m.user.id) || [];
        return {
          user: m.user,
          totalTests: tests.length,
          passedTests: tests.filter(
            (t) => t.status.toUpperCase() === 'PASSED',
          ).length,
          failedTests: tests.filter(
            (t) => t.status.toUpperCase() === 'FAILED',
          ).length,
          unsupportedTests: tests.filter(
            (t) => t.status.toUpperCase() === 'UNSUPPORTED',
          ).length,
        };
      });
  }

  async getTrainingVideos(memberId: string, organizationId: string) {
    const member = await MemberQueries.findByIdInOrganization(
      memberId,
      organizationId,
    );

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in organization ${organizationId}`,
      );
    }

    return db.employeeTrainingVideoCompletion.findMany({
      where: { memberId },
      orderBy: { videoId: 'asc' },
    });
  }

  async getFleetCompliance(memberId: string, organizationId: string) {
    const member = await MemberQueries.findByIdInOrganization(
      memberId,
      organizationId,
    );

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in organization ${organizationId}`,
      );
    }

    return getFleetComplianceForMember(
      this.fleetService,
      memberId,
      organizationId,
      member.fleetDmLabelId,
      member.userId,
    );
  }

  async getDevices(organizationId: string) {
    return getAllEmployeeDevices(this.fleetService, organizationId);
  }

  async getEmailPreferences(
    userId: string,
    userEmail: string,
    organizationId: string,
  ) {
    const DEFAULT_PREFERENCES = {
      policyNotifications: true,
      taskReminders: true,
      weeklyTaskDigest: true,
      unassignedItemsNotifications: true,
      taskMentions: true,
      taskAssignments: true,
    };

    const [user, member] = await Promise.all([
      db.user.findUnique({
        where: { email: userEmail },
        select: {
          emailPreferences: true,
          emailNotificationsUnsubscribed: true,
        },
      }),
      db.member.findFirst({
        where: {
          organizationId,
          user: { email: userEmail },
          deactivated: false,
        },
        select: { role: true },
      }),
    ]);

    const userRoles = member?.role.split(',').map((r) => r.trim()) ?? [];
    const isAdminOrOwner = userRoles.some(
      (r) => r === 'owner' || r === 'admin',
    );

    let roleNotifications: Record<string, boolean> | null = null;

    if (!isAdminOrOwner && userRoles.length > 0) {
      const roleSettings = await db.roleNotificationSetting.findMany({
        where: { organizationId, role: { in: userRoles } },
      });

      if (roleSettings.length > 0) {
        roleNotifications = {
          policyNotifications: roleSettings.some(
            (s) => s.policyNotifications,
          ),
          taskReminders: roleSettings.some((s) => s.taskReminders),
          taskAssignments: roleSettings.some((s) => s.taskAssignments),
          taskMentions: roleSettings.some((s) => s.taskMentions),
          weeklyTaskDigest: roleSettings.some((s) => s.weeklyTaskDigest),
          findingNotifications: roleSettings.some(
            (s) => s.findingNotifications,
          ),
        };
      }
    }

    let preferences: Record<string, boolean>;
    if (user?.emailNotificationsUnsubscribed) {
      preferences = {
        policyNotifications: false,
        taskReminders: false,
        weeklyTaskDigest: false,
        unassignedItemsNotifications: false,
        taskMentions: false,
        taskAssignments: false,
      };
    } else if (
      user?.emailPreferences &&
      typeof user.emailPreferences === 'object'
    ) {
      preferences = {
        ...DEFAULT_PREFERENCES,
        ...(user.emailPreferences as Record<string, boolean>),
      };
    } else {
      preferences = DEFAULT_PREFERENCES;
    }

    return {
      email: userEmail,
      preferences,
      isAdminOrOwner,
      roleNotifications,
    };
  }

  async updateEmailPreferences(
    userId: string,
    preferences: {
      policyNotifications: boolean;
      taskReminders: boolean;
      weeklyTaskDigest: boolean;
      unassignedItemsNotifications: boolean;
      taskMentions: boolean;
      taskAssignments: boolean;
    },
  ) {
    try {
      const allUnsubscribed = Object.values(preferences).every(
        (v) => v === false,
      );

      await db.user.update({
        where: { id: userId },
        data: {
          emailPreferences: preferences,
          emailNotificationsUnsubscribed: allUnsubscribed,
        },
      });

      this.logger.log(`Updated email preferences for user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to update email preferences for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
