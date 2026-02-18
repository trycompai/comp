import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { FleetService } from '../lib/fleet.service';
import type { PeopleResponseDto } from './dto/people-responses.dto';
import type { CreatePeopleDto } from './dto/create-people.dto';
import type { UpdatePeopleDto } from './dto/update-people.dto';
import type { BulkCreatePeopleDto } from './dto/bulk-create-people.dto';
import { MemberValidator } from './utils/member-validator';
import { MemberQueries } from './utils/member-queries';

@Injectable()
export class PeopleService {
  private readonly logger = new Logger(PeopleService.name);

  constructor(private readonly fleetService: FleetService) {}

  async findAllByOrganization(
    organizationId: string,
  ): Promise<PeopleResponseDto[]> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const members = await MemberQueries.findAllByOrganization(organizationId);

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
  ): Promise<{
    success: boolean;
    deletedMember: { id: string; name: string; email: string };
  }> {
    try {
      await MemberValidator.validateOrganization(organizationId);
      const member = await MemberQueries.findMemberForDeletion(
        memberId,
        organizationId,
      );

      if (!member) {
        throw new NotFoundException(
          `Member with ID ${memberId} not found in organization ${organizationId}`,
        );
      }

      await MemberQueries.deleteMember(memberId);

      this.logger.log(
        `Deleted member: ${member.user.name} (${memberId}) from organization ${organizationId}`,
      );
      return {
        success: true,
        deletedMember: {
          id: member.id,
          name: member.user.name,
          email: member.user.email,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete member ${memberId} from organization ${organizationId}:`,
        error,
      );
      throw new Error(`Failed to delete member: ${error.message}`);
    }
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
}
