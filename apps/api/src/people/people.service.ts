import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { db } from '@trycompai/db';
import type { PeopleResponseDto } from './dto/people-responses.dto';
import type { CreatePeopleDto } from './dto/create-people.dto';
import type { UpdatePeopleDto } from './dto/update-people.dto';

@Injectable()
export class PeopleService {
  private readonly logger = new Logger(PeopleService.name);

  async findAllByOrganization(organizationId: string): Promise<PeopleResponseDto[]> {
    try {
      // First verify the organization exists
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Get all members for the organization with user information
      const members = await db.member.findMany({
        where: { organizationId },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          createdAt: true,
          department: true,
          isActive: true,
          fleetDmLabelId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              createdAt: true,
              updatedAt: true,
              lastLogin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(`Retrieved ${members.length} members for organization ${organizationId}`);
      return members;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve members for organization ${organizationId}:`, error);
      throw new Error(`Failed to retrieve members: ${error.message}`);
    }
  }

  async findById(memberId: string, organizationId: string): Promise<PeopleResponseDto> {
    try {
      // First verify the organization exists
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Get the specific member with user information
      const member = await db.member.findFirst({
        where: { 
          id: memberId,
          organizationId,
        },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          createdAt: true,
          department: true,
          isActive: true,
          fleetDmLabelId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              createdAt: true,
              updatedAt: true,
              lastLogin: true,
            },
          },
        },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
      }

      this.logger.log(`Retrieved member: ${member.user.name} (${memberId})`);
      return member;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve member ${memberId} in organization ${organizationId}:`, error);
      throw new Error(`Failed to retrieve member: ${error.message}`);
    }
  }

  async create(organizationId: string, createData: CreatePeopleDto): Promise<PeopleResponseDto> {
    try {
      // First verify the organization exists
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Verify the user exists
      const user = await db.user.findUnique({
        where: { id: createData.userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${createData.userId} not found`);
      }

      // Check if user is already a member of this organization
      const existingMember = await db.member.findFirst({
        where: {
          userId: createData.userId,
          organizationId,
        },
      });

      if (existingMember) {
        throw new BadRequestException(`User ${user.email} is already a member of this organization`);
      }

      // Create the new member
      const member = await db.member.create({
        data: {
          organizationId,
          userId: createData.userId,
          role: createData.role,
          department: createData.department || 'none',
          isActive: createData.isActive ?? true,
          fleetDmLabelId: createData.fleetDmLabelId || null,
        },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          createdAt: true,
          department: true,
          isActive: true,
          fleetDmLabelId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              createdAt: true,
              updatedAt: true,
              lastLogin: true,
            },
          },
        },
      });

      this.logger.log(`Created member: ${member.user.name} (${member.id}) for organization ${organizationId}`);
      return member;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create member for organization ${organizationId}:`, error);
      throw new Error(`Failed to create member: ${error.message}`);
    }
  }

  async updateById(memberId: string, organizationId: string, updateData: UpdatePeopleDto): Promise<PeopleResponseDto> {
    try {
      // First verify the organization exists
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Check if the member exists and belongs to the organization
      const existingMember = await db.member.findFirst({
        where: { 
          id: memberId,
          organizationId,
        },
        select: { id: true, userId: true },
      });

      if (!existingMember) {
        throw new NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
      }

      // If userId is being updated, verify the new user exists and isn't already a member
      if (updateData.userId && updateData.userId !== existingMember.userId) {
        const user = await db.user.findUnique({
          where: { id: updateData.userId },
          select: { id: true, email: true },
        });

        if (!user) {
          throw new NotFoundException(`User with ID ${updateData.userId} not found`);
        }

        // Check if the new user is already a member of this organization
        const duplicateMember = await db.member.findFirst({
          where: {
            userId: updateData.userId,
            organizationId,
            id: { not: memberId }, // Exclude the current member being updated
          },
        });

        if (duplicateMember) {
          throw new BadRequestException(`User ${user.email} is already a member of this organization`);
        }
      }

      // Prepare update data with defaults for optional fields
      const updatePayload: any = { ...updateData };
      
      // Handle fleetDmLabelId: convert undefined to null for database
      if (updateData.fleetDmLabelId === undefined && 'fleetDmLabelId' in updateData) {
        updatePayload.fleetDmLabelId = null;
      }

      // Update the member
      const updatedMember = await db.member.update({
        where: { id: memberId },
        data: updatePayload,
        select: {
          id: true,
          organizationId: true,
          userId: true,
          role: true,
          createdAt: true,
          department: true,
          isActive: true,
          fleetDmLabelId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              emailVerified: true,
              image: true,
              createdAt: true,
              updatedAt: true,
              lastLogin: true,
            },
          },
        },
      });

      this.logger.log(`Updated member: ${updatedMember.user.name} (${memberId})`);
      return updatedMember;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update member ${memberId} in organization ${organizationId}:`, error);
      throw new Error(`Failed to update member: ${error.message}`);
    }
  }

  async deleteById(memberId: string, organizationId: string): Promise<{ success: boolean; deletedMember: { id: string; name: string; email: string } }> {
    try {
      // First verify the organization exists
      const organization = await db.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Check if the member exists and belongs to the organization
      const member = await db.member.findFirst({
        where: { 
          id: memberId,
          organizationId,
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
      }

      // Delete the member
      await db.member.delete({
        where: { id: memberId },
      });

      this.logger.log(`Deleted member: ${member.user.name} (${memberId}) from organization ${organizationId}`);
      return { 
        success: true, 
        deletedMember: {
          id: member.id,
          name: member.user.name,
          email: member.user.email,
        }
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete member ${memberId} from organization ${organizationId}:`, error);
      throw new Error(`Failed to delete member: ${error.message}`);
    }
  }
}
