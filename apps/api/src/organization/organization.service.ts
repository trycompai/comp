import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db, Role } from '@trycompai/db';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';
import type { TransferOwnershipResponseDto } from './dto/transfer-ownership.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  async findById(id: string) {
    try {
      const organization = await db.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          metadata: true,
          website: true,
          onboardingCompleted: true,
          hasAccess: true,
          fleetDmLabelId: true,
          isFleetSetupCompleted: true,
          primaryColor: true,
          createdAt: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      this.logger.log(`Retrieved organization: ${organization.name} (${id})`);
      return organization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve organization ${id}:`, error);
      throw error;
    }
  }

  async updateById(id: string, updateData: UpdateOrganizationDto) {
    try {
      // First check if the organization exists
      const existingOrganization = await db.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          metadata: true,
          website: true,
          onboardingCompleted: true,
          hasAccess: true,
          fleetDmLabelId: true,
          isFleetSetupCompleted: true,
          primaryColor: true,
          createdAt: true,
        },
      });

      if (!existingOrganization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      // Update the organization with only provided fields
      const updatedOrganization = await db.organization.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          metadata: true,
          website: true,
          onboardingCompleted: true,
          hasAccess: true,
          fleetDmLabelId: true,
          isFleetSetupCompleted: true,
          primaryColor: true,
          createdAt: true,
        },
      });

      this.logger.log(
        `Updated organization: ${updatedOrganization.name} (${id})`,
      );
      return updatedOrganization;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update organization ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string) {
    try {
      // First check if the organization exists
      const organization = await db.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${id} not found`);
      }

      // Delete the organization
      await db.organization.delete({
        where: { id },
      });

      this.logger.log(`Deleted organization: ${organization.name} (${id})`);
      return { success: true, deletedOrganization: organization };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete organization ${id}:`, error);
      throw error;
    }
  }

  async transferOwnership(
    organizationId: string,
    currentUserId: string,
    newOwnerId: string,
  ): Promise<TransferOwnershipResponseDto> {
    try {
      // Validate input
      if (!newOwnerId || newOwnerId.trim() === '') {
        throw new BadRequestException('New owner must be selected');
      }

      // Get current user's member record
      const currentUserMember = await db.member.findFirst({
        where: { organizationId, userId: currentUserId },
      });

      if (!currentUserMember) {
        throw new ForbiddenException(
          'Current user is not a member of this organization',
        );
      }

      // Check if current user is the owner
      const currentUserRoles =
        currentUserMember.role?.split(',').map((r) => r.trim()) ?? [];
      if (!currentUserRoles.includes(Role.owner)) {
        throw new ForbiddenException(
          'Only the organization owner can transfer ownership',
        );
      }

      // Get new owner's member record
      const newOwnerMember = await db.member.findFirst({
        where: {
          id: newOwnerId,
          organizationId,
          deactivated: false,
        },
      });

      if (!newOwnerMember) {
        throw new NotFoundException('New owner not found or is deactivated');
      }

      // Prevent transferring to self
      if (newOwnerMember.userId === currentUserId) {
        throw new BadRequestException(
          'You cannot transfer ownership to yourself',
        );
      }

      // Parse new owner's current roles
      const newOwnerRoles =
        newOwnerMember.role?.split(',').map((r) => r.trim()) ?? [];

      // Check if new owner already has owner role (shouldn't happen, but safety check)
      if (newOwnerRoles.includes(Role.owner)) {
        throw new BadRequestException('Selected member is already an owner');
      }

      // Prepare updated roles for current owner:
      // Remove 'owner', add 'admin' if not present, keep all other roles
      const updatedCurrentOwnerRoles = currentUserRoles
        .filter((role) => role !== Role.owner) // Remove owner
        .concat(currentUserRoles.includes(Role.admin) ? [] : [Role.admin]); // Add admin if not present

      // Prepare updated roles for new owner:
      // Add 'owner', keep all existing roles
      const updatedNewOwnerRoles = [...new Set([...newOwnerRoles, Role.owner])]; // Use Set to avoid duplicates

      this.logger.log('[Transfer Ownership] Role updates:', {
        organizationId,
        currentOwner: {
          memberId: currentUserMember.id,
          userId: currentUserId,
          before: currentUserRoles,
          after: updatedCurrentOwnerRoles,
        },
        newOwner: {
          memberId: newOwnerMember.id,
          userId: newOwnerMember.userId,
          before: newOwnerRoles,
          after: updatedNewOwnerRoles,
        },
      });

      // Update both members in a transaction
      await db.$transaction([
        // Remove owner role from current user and add admin role (keep other roles)
        db.member.update({
          where: { id: currentUserMember.id },
          data: {
            role: updatedCurrentOwnerRoles.sort().join(','),
          },
        }),
        // Add owner role to new owner (keep all existing roles)
        db.member.update({
          where: { id: newOwnerMember.id },
          data: {
            role: updatedNewOwnerRoles.sort().join(','),
          },
        }),
      ]);

      this.logger.log(
        `Ownership transferred successfully for organization ${organizationId}`,
      );

      return {
        success: true,
        message: 'Ownership transferred successfully',
        currentOwner: {
          memberId: currentUserMember.id,
          previousRoles: currentUserRoles,
          newRoles: updatedCurrentOwnerRoles,
        },
        newOwner: {
          memberId: newOwnerMember.id,
          previousRoles: newOwnerRoles,
          newRoles: updatedNewOwnerRoles,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to transfer ownership for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }
  async getPrimaryColor(organizationId: string, token?: string) {
    try {
      let targetOrgId = organizationId;

      // If token is provided, resolve organization from the access grant
      if (token) {
        const grant = await db.trustAccessGrant.findUnique({
          where: { accessToken: token },
          select: {
            expiresAt: true,
            accessRequest: {
              select: {
                organizationId: true,
              },
            },
          },
        });

        if (!grant) {
          throw new NotFoundException('Invalid or expired access token');
        }

        if (grant.expiresAt && new Date() > grant.expiresAt) {
          throw new NotFoundException('Access token has expired');
        }

        targetOrgId = grant.accessRequest.organizationId;
      }

      const primaryColor = await db.organization.findUnique({
        where: { id: targetOrgId },
        select: { primaryColor: true },
      });

      if (!primaryColor) {
        throw new NotFoundException(`Organization with ID ${targetOrgId} not found`);
      }

      this.logger.log(
        `Retrieved organization primary color for organization ${targetOrgId}: ${primaryColor.primaryColor}`,
      );

      return {
        primaryColor: primaryColor.primaryColor,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to retrieve organization primary color for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }
}
