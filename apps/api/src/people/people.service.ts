import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '@db';
import { FleetService } from '../lib/fleet.service';
import { BUILT_IN_ROLE_PERMISSIONS } from '@trycompai/auth';
import type { PeopleResponseDto } from './dto/people-responses.dto';
import type { CreatePeopleDto } from './dto/create-people.dto';
import type { UpdatePeopleDto } from './dto/update-people.dto';
import type { BulkCreatePeopleDto } from './dto/bulk-create-people.dto';
import { MemberValidator } from './utils/member-validator';
import { MemberQueries } from './utils/member-queries';
import {
  collectAssignedItems,
  clearAssignments,
  removeMemberFromOrgChart,
  notifyOwnerOfUnassignedItems,
} from './utils/member-deactivation';

@Injectable()
export class PeopleService {
  private readonly logger = new Logger(PeopleService.name);

  constructor(private readonly fleetService: FleetService) {}

  async findAllByOrganization(
    organizationId: string,
    includeDeactivated?: boolean,
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
      throw new Error(`Failed to retrieve members: ${error.message}`);
    }
  }

  async findMentionableMembers(
    organizationId: string,
    resource: string,
  ): Promise<PeopleResponseDto[]> {
    const members = await MemberQueries.findAllByOrganization(
      organizationId,
      false,
    );

    // Collect all unique role names across members
    const allRoleNames = new Set<string>();
    for (const member of members) {
      const roles = member.role.split(',').map((r) => r.trim()).filter(Boolean);
      for (const role of roles) {
        allRoleNames.add(role);
      }
    }

    // Batch-resolve permissions: built-in from constants, custom from DB
    const builtInRoleNames = [...allRoleNames].filter(
      (name) => BUILT_IN_ROLE_PERMISSIONS[name] !== undefined,
    );
    const customRoleNames = [...allRoleNames].filter(
      (name) => BUILT_IN_ROLE_PERMISSIONS[name] === undefined,
    );

    // Build permission map for all roles
    const permissionMap = new Map<string, Record<string, string[]>>();
    for (const name of builtInRoleNames) {
      permissionMap.set(name, BUILT_IN_ROLE_PERMISSIONS[name]);
    }

    // Batch-fetch custom role permissions in one query
    if (customRoleNames.length > 0) {
      const customRoles = await db.organizationRole.findMany({
        where: { organizationId, name: { in: customRoleNames } },
      });
      for (const role of customRoles) {
        const perms = typeof role.permissions === 'string'
          ? JSON.parse(role.permissions) as Record<string, string[]>
          : role.permissions as Record<string, string[]>;
        permissionMap.set(role.name, perms);
      }
    }

    // Filter members whose combined permissions include the required permission
    return members.filter((member) => {
      const roles = member.role.split(',').map((r) => r.trim()).filter(Boolean);
      for (const role of roles) {
        const perms = permissionMap.get(role);
        if (perms && perms[resource]?.includes('read')) {
          return true;
        }
      }
      return false;
    });
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
      throw new Error(`Failed to retrieve member: ${error.message}`);
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
      throw new Error(`Failed to create member: ${error.message}`);
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
      throw new Error(`Failed to bulk create members: ${error.message}`);
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
        organizationId,
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
      throw new Error(`Failed to update member: ${error.message}`);
    }
  }

  async deleteById(
    memberId: string,
    organizationId: string,
    callerUserId?: string,
  ): Promise<{
    success: boolean;
    deletedMember: { id: string; name: string; email: string };
  }> {
    await MemberValidator.validateOrganization(organizationId);

    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
      include: { user: true },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in organization ${organizationId}`,
      );
    }

    if (callerUserId && member.user.id === callerUserId) {
      throw new ForbiddenException('You cannot remove yourself');
    }

    if (member.role.includes('owner')) {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    if (member.user.role === 'admin') {
      throw new ForbiddenException('Cannot remove a platform admin');
    }

    const unassignedItems = await collectAssignedItems({
      memberId,
      organizationId,
    });

    await clearAssignments({ memberId, organizationId });
    await removeMemberFromOrgChart({ organizationId, memberId });

    await db.member.update({
      where: { id: memberId, organizationId },
      data: { deactivated: true, isActive: false },
    });

    // Direct DB session deletion is correct here — the API server IS the auth server,
    // and better-auth's own revokeUserSessions internally calls the same deleteSessions operation.
    // The admin endpoint wrapper requires an authenticated admin session context we don't have.
    await db.session.deleteMany({ where: { userId: member.userId } });

    if (member.fleetDmLabelId) {
      try {
        await this.fleetService.removeHostsByLabel(member.fleetDmLabelId);
      } catch (fleetError) {
        this.logger.error('Failed to remove Fleet hosts:', fleetError);
      }
    }

    await notifyOwnerOfUnassignedItems({
      organizationId,
      removedMemberName: member.user.name || member.user.email || 'Member',
      unassignedItems,
    });

    this.logger.log(
      `Deactivated member: ${member.user.name} (${memberId}) from organization ${organizationId}`,
    );

    return {
      success: true,
      deletedMember: {
        id: member.id,
        name: member.user.name,
        email: member.user.email,
      },
    };
  }

  async reactivateById(
    memberId: string,
    organizationId: string,
  ): Promise<PeopleResponseDto> {
    const member = await MemberQueries.findByIdInOrganization(
      memberId,
      organizationId,
    );

    if (member) {
      throw new BadRequestException('Member is already active');
    }

    // Look for deactivated member
    const deactivatedMember = await db.member.findFirst({
      where: { id: memberId, organizationId },
    });

    if (!deactivatedMember) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in organization ${organizationId}`,
      );
    }

    return db.member.update({
      where: { id: memberId, organizationId },
      data: { deactivated: false, isActive: true },
      select: MemberQueries.MEMBER_SELECT,
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

      // Also delete device-agent Device records for this member
      try {
        const deleteResult = await db.device.deleteMany({
          where: {
            memberId,
            organizationId,
          },
        });
        if (deleteResult.count > 0) {
          this.logger.log(
            `Deleted ${deleteResult.count} device-agent device(s) for member ${memberId} in org ${organizationId}`,
          );
        }
      } catch (deviceError) {
        // Log but don't fail the operation
        this.logger.error(
          `Failed to delete device-agent devices for member ${memberId}:`,
          deviceError,
        );
      }

      const updatedMember = await MemberQueries.unlinkDevice(memberId, organizationId);

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
      throw new Error(`Failed to unlink device: ${error.message}`);
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
      throw new Error(`Failed to remove host: ${error.message}`);
    }
  }

  async getDevices(organizationId: string) {
    return db.device.findMany({
      where: { organizationId },
      include: { member: { include: { user: true } } },
      orderBy: { installedAt: 'desc' },
    });
  }

  async getTestStatsByAssignee(organizationId: string) {
    const tasks = await db.task.findMany({
      where: { organizationId },
      select: { assigneeId: true, status: true },
    });
    const stats = new Map<string, { total: number; done: number }>();
    for (const task of tasks) {
      if (!task.assigneeId) continue;
      const existing = stats.get(task.assigneeId) || { total: 0, done: 0 };
      existing.total++;
      if (task.status === 'done') existing.done++;
      stats.set(task.assigneeId, existing);
    }
    return Object.fromEntries(stats);
  }

  async getTrainingVideos(memberId: string, organizationId: string) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return db.employeeTrainingVideoCompletion.findMany({
      where: { memberId },
      orderBy: { completedAt: 'desc' },
    });
  }

  async getFleetCompliance(memberId: string, organizationId: string) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
      select: { id: true, userId: true, fleetDmLabelId: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.fleetDmLabelId) return { hosts: [], policyResults: [] };

    const [hosts, policyResults] = await Promise.all([
      this.fleetService
        .getHostsByLabel(member.fleetDmLabelId)
        .then((r) => r?.hosts ?? []),
      db.fleetPolicyResult.findMany({
        where: { userId: member.userId, organizationId },
      }),
    ]);
    return { hosts, policyResults };
  }

  async getEmailPreferences(
    userId: string,
    userEmail: string,
    organizationId: string,
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        emailPreferences: true,
        emailNotificationsUnsubscribed: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      email: userEmail,
      preferences: user.emailPreferences ?? {},
      unsubscribed: user.emailNotificationsUnsubscribed ?? false,
    };
  }

  async updateEmailPreferences(
    userId: string,
    preferences: Record<string, boolean>,
  ) {
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
    return { success: true };
  }
}
