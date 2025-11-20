"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VendorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorsService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
let VendorsService = VendorsService_1 = class VendorsService {
    logger = new common_1.Logger(VendorsService_1.name);
    async findAllByOrganization(organizationId) {
        try {
            const vendors = await db_1.db.vendor.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Retrieved ${vendors.length} vendors for organization ${organizationId}`);
            return vendors;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve vendors for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async findById(id, organizationId) {
        try {
            const vendor = await db_1.db.vendor.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });
            if (!vendor) {
                throw new common_1.NotFoundException(`Vendor with ID ${id} not found in organization ${organizationId}`);
            }
            this.logger.log(`Retrieved vendor: ${vendor.name} (${id})`);
            return vendor;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve vendor ${id}:`, error);
            throw error;
        }
    }
    async create(organizationId, createVendorDto) {
        try {
            const vendor = await db_1.db.vendor.create({
                data: {
                    ...createVendorDto,
                    organizationId,
                },
            });
            this.logger.log(`Created new vendor: ${vendor.name} (${vendor.id}) for organization ${organizationId}`);
            return vendor;
        }
        catch (error) {
            this.logger.error(`Failed to create vendor for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async updateById(id, organizationId, updateVendorDto) {
        try {
            await this.findById(id, organizationId);
            const updatedVendor = await db_1.db.vendor.update({
                where: { id },
                data: updateVendorDto,
            });
            this.logger.log(`Updated vendor: ${updatedVendor.name} (${id})`);
            return updatedVendor;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update vendor ${id}:`, error);
            throw error;
        }
    }
    async deleteById(id, organizationId) {
        try {
            const existingVendor = await this.findById(id, organizationId);
            await db_1.db.vendor.delete({
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete vendor ${id}:`, error);
            throw error;
        }
    }
};
exports.VendorsService = VendorsService;
exports.VendorsService = VendorsService = VendorsService_1 = __decorate([
    (0, common_1.Injectable)()
], VendorsService);
//# sourceMappingURL=vendors.service.js.map