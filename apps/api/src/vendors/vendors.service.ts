import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { tasks } from '@trigger.dev/sdk';
import type { TriggerVendorRiskAssessmentVendorDto } from './dto/trigger-vendor-risk-assessment.dto';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  async findAllByOrganization(organizationId: string) {
    try {
      const vendors = await db.vendor.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(
        `Retrieved ${vendors.length} vendors for organization ${organizationId}`,
      );
      return vendors;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve vendors for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      const vendor = await db.vendor.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!vendor) {
        throw new NotFoundException(
          `Vendor with ID ${id} not found in organization ${organizationId}`,
        );
      }

      this.logger.log(`Retrieved vendor: ${vendor.name} (${id})`);
      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve vendor ${id}:`, error);
      throw error;
    }
  }

  async create(
    organizationId: string,
    createVendorDto: CreateVendorDto,
    createdByUserId?: string,
  ) {
    try {
      const vendor = await db.vendor.create({
        data: {
          ...createVendorDto,
          organizationId,
        },
      });

      this.logger.log(
        `Created new vendor: ${vendor.name} (${vendor.id}) for organization ${organizationId}`,
      );

      // Trigger background task to research vendor and create risk assessment task
      try {
        const handle = await tasks.trigger('vendor-risk-assessment-task', {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorWebsite: vendor.website,
          organizationId,
          createdByUserId: createdByUserId || null,
        });

        this.logger.log(
          `Triggered vendor risk assessment task (${handle.id}) for vendor ${vendor.id}`,
        );
      } catch (triggerError) {
        // Don't fail vendor creation if task trigger fails
        this.logger.error(
          `Failed to trigger risk assessment task for vendor ${vendor.id}:`,
          triggerError,
        );
      }

      return vendor;
    } catch (error) {
      this.logger.error(
        `Failed to create vendor for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async triggerVendorRiskAssessments(params: {
    organizationId: string;
    withResearch: boolean;
    vendors: TriggerVendorRiskAssessmentVendorDto[];
  }): Promise<{ triggered: number; batchId: string | null }> {
    const { organizationId, withResearch, vendors } = params;

    if (vendors.length === 0) {
      this.logger.log('No vendors to trigger risk assessments for');
      return { triggered: 0, batchId: null };
    }

    this.logger.log('Preparing to batch trigger vendor risk assessment tasks', {
      organizationId,
      vendorCount: vendors.length,
      withResearch,
      vendorIds: vendors.map((v) => v.vendorId),
    });

    // Use batchTrigger for efficiency (less overhead than N individual triggers)
    const batch = vendors.map((v) => ({
      payload: {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        vendorWebsite: v.vendorWebsite ?? null,
        organizationId,
        createdByUserId: null,
        withResearch,
      },
    }));

    try {
      const batchHandle = await tasks.batchTrigger('vendor-risk-assessment-task', batch);

      this.logger.log(
        `Successfully triggered ${vendors.length} vendor risk assessment tasks for organization ${organizationId}`,
        {
          batchId: batchHandle.batchId,
          vendorCount: vendors.length,
        },
      );

      return {
        triggered: vendors.length,
        batchId: batchHandle.batchId,
      };
    } catch (error) {
      this.logger.error('Failed to batch trigger vendor risk assessment tasks', {
        organizationId,
        vendorCount: vendors.length,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateById(
    id: string,
    organizationId: string,
    updateVendorDto: UpdateVendorDto,
  ) {
    try {
      // First check if the vendor exists in the organization
      await this.findById(id, organizationId);

      const updatedVendor = await db.vendor.update({
        where: { id },
        data: updateVendorDto,
      });

      this.logger.log(`Updated vendor: ${updatedVendor.name} (${id})`);
      return updatedVendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update vendor ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string, organizationId: string) {
    try {
      // First check if the vendor exists in the organization
      const existingVendor = await this.findById(id, organizationId);

      await db.vendor.delete({
        where: { id },
      });

      this.logger.log(`Deleted vendor: ${existingVendor.name} (${id})`);
      return {
        message: 'Vendor deleted successfully',
        deletedVendor: {
          id: existingVendor.id,
          name: existingVendor.name,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete vendor ${id}:`, error);
      throw error;
    }
  }
}
