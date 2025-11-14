import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

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
}
