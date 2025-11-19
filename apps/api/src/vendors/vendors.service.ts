import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

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

  async create(organizationId: string, createVendorDto: CreateVendorDto) {
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
      return vendor;
    } catch (error) {
      this.logger.error(
        `Failed to create vendor for organization ${organizationId}:`,
        error,
      );
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
