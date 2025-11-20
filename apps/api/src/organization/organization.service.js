"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OrganizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
let OrganizationService = OrganizationService_1 = class OrganizationService {
    logger = new common_1.Logger(OrganizationService_1.name);
    async findById(id) {
        try {
            const organization = await db_1.db.organization.findUnique({
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
                throw new common_1.NotFoundException(`Organization with ID ${id} not found`);
            }
            this.logger.log(`Retrieved organization: ${organization.name} (${id})`);
            return organization;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve organization ${id}:`, error);
            throw error;
        }
    }
    async updateById(id, updateData) {
        try {
            const existingOrganization = await db_1.db.organization.findUnique({
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
                throw new common_1.NotFoundException(`Organization with ID ${id} not found`);
            }
            const updatedOrganization = await db_1.db.organization.update({
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
            this.logger.log(`Updated organization: ${updatedOrganization.name} (${id})`);
            return updatedOrganization;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update organization ${id}:`, error);
            throw error;
        }
    }
    async deleteById(id) {
        try {
            const organization = await db_1.db.organization.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                },
            });
            if (!organization) {
                throw new common_1.NotFoundException(`Organization with ID ${id} not found`);
            }
            await db_1.db.organization.delete({
                where: { id },
            });
            this.logger.log(`Deleted organization: ${organization.name} (${id})`);
            return { success: true, deletedOrganization: organization };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete organization ${id}:`, error);
            throw error;
        }
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = OrganizationService_1 = __decorate([
    (0, common_1.Injectable)()
], OrganizationService);
//# sourceMappingURL=organization.service.js.map