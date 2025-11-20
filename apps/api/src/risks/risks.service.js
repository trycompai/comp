"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RisksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RisksService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const create_risk_dto_1 = require("./dto/create-risk.dto");
const update_risk_dto_1 = require("./dto/update-risk.dto");
let RisksService = RisksService_1 = class RisksService {
    logger = new common_1.Logger(RisksService_1.name);
    async findAllByOrganization(organizationId) {
        try {
            const risks = await db_1.db.risk.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Retrieved ${risks.length} risks for organization ${organizationId}`);
            return risks;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve risks for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async findById(id, organizationId) {
        try {
            const risk = await db_1.db.risk.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });
            if (!risk) {
                throw new common_1.NotFoundException(`Risk with ID ${id} not found in organization ${organizationId}`);
            }
            this.logger.log(`Retrieved risk: ${risk.title} (${id})`);
            return risk;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve risk ${id}:`, error);
            throw error;
        }
    }
    async create(organizationId, createRiskDto) {
        try {
            const risk = await db_1.db.risk.create({
                data: {
                    ...createRiskDto,
                    organizationId,
                },
            });
            this.logger.log(`Created new risk: ${risk.title} (${risk.id}) for organization ${organizationId}`);
            return risk;
        }
        catch (error) {
            this.logger.error(`Failed to create risk for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async updateById(id, organizationId, updateRiskDto) {
        try {
            await this.findById(id, organizationId);
            const updatedRisk = await db_1.db.risk.update({
                where: { id },
                data: updateRiskDto,
            });
            this.logger.log(`Updated risk: ${updatedRisk.title} (${id})`);
            return updatedRisk;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update risk ${id}:`, error);
            throw error;
        }
    }
    async deleteById(id, organizationId) {
        try {
            const existingRisk = await this.findById(id, organizationId);
            await db_1.db.risk.delete({
                where: { id },
            });
            this.logger.log(`Deleted risk: ${existingRisk.title} (${id})`);
            return {
                message: 'Risk deleted successfully',
                deletedRisk: {
                    id: existingRisk.id,
                    title: existingRisk.title,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete risk ${id}:`, error);
            throw error;
        }
    }
};
exports.RisksService = RisksService;
exports.RisksService = RisksService = RisksService_1 = __decorate([
    (0, common_1.Injectable)()
], RisksService);
//# sourceMappingURL=risks.service.js.map