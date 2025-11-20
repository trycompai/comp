"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PoliciesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoliciesService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
let PoliciesService = PoliciesService_1 = class PoliciesService {
    logger = new common_1.Logger(PoliciesService_1.name);
    async findAll(organizationId) {
        try {
            const policies = await db_1.db.policy.findMany({
                where: { organizationId },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                    content: true,
                    frequency: true,
                    department: true,
                    isRequiredToSign: true,
                    signedBy: true,
                    reviewDate: true,
                    isArchived: true,
                    createdAt: true,
                    updatedAt: true,
                    lastArchivedAt: true,
                    lastPublishedAt: true,
                    organizationId: true,
                    assigneeId: true,
                    approverId: true,
                    policyTemplateId: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Retrieved ${policies.length} policies for organization ${organizationId}`);
            return policies;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve policies for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async findById(id, organizationId) {
        try {
            const policy = await db_1.db.policy.findFirst({
                where: {
                    id,
                    organizationId,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                    content: true,
                    frequency: true,
                    department: true,
                    isRequiredToSign: true,
                    signedBy: true,
                    reviewDate: true,
                    isArchived: true,
                    createdAt: true,
                    updatedAt: true,
                    lastArchivedAt: true,
                    lastPublishedAt: true,
                    organizationId: true,
                    assigneeId: true,
                    approverId: true,
                    policyTemplateId: true,
                },
            });
            if (!policy) {
                throw new common_1.NotFoundException(`Policy with ID ${id} not found`);
            }
            this.logger.log(`Retrieved policy: ${policy.name} (${id})`);
            return policy;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve policy ${id}:`, error);
            throw error;
        }
    }
    async create(organizationId, createData) {
        try {
            const policy = await db_1.db.policy.create({
                data: {
                    ...createData,
                    content: createData.content,
                    organizationId,
                    status: createData.status || 'draft',
                    isRequiredToSign: createData.isRequiredToSign ?? true,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                    content: true,
                    frequency: true,
                    department: true,
                    isRequiredToSign: true,
                    signedBy: true,
                    reviewDate: true,
                    isArchived: true,
                    createdAt: true,
                    updatedAt: true,
                    lastArchivedAt: true,
                    lastPublishedAt: true,
                    organizationId: true,
                    assigneeId: true,
                    approverId: true,
                    policyTemplateId: true,
                },
            });
            this.logger.log(`Created policy: ${policy.name} (${policy.id})`);
            return policy;
        }
        catch (error) {
            this.logger.error(`Failed to create policy for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async updateById(id, organizationId, updateData) {
        try {
            const existingPolicy = await db_1.db.policy.findFirst({
                where: {
                    id,
                    organizationId,
                },
                select: { id: true, name: true },
            });
            if (!existingPolicy) {
                throw new common_1.NotFoundException(`Policy with ID ${id} not found`);
            }
            const updatePayload = { ...updateData };
            if (updateData.status === 'published') {
                updatePayload.lastPublishedAt = new Date();
            }
            if (updateData.isArchived === true) {
                updatePayload.lastArchivedAt = new Date();
            }
            if (Array.isArray(updateData.content)) {
                updatePayload.content = updateData.content;
            }
            const updatedPolicy = await db_1.db.policy.update({
                where: { id },
                data: updatePayload,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    status: true,
                    content: true,
                    frequency: true,
                    department: true,
                    isRequiredToSign: true,
                    signedBy: true,
                    reviewDate: true,
                    isArchived: true,
                    createdAt: true,
                    updatedAt: true,
                    lastArchivedAt: true,
                    lastPublishedAt: true,
                    organizationId: true,
                    assigneeId: true,
                    approverId: true,
                    policyTemplateId: true,
                },
            });
            this.logger.log(`Updated policy: ${updatedPolicy.name} (${id})`);
            return updatedPolicy;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update policy ${id}:`, error);
            throw error;
        }
    }
    async deleteById(id, organizationId) {
        try {
            const policy = await db_1.db.policy.findFirst({
                where: {
                    id,
                    organizationId,
                },
                select: {
                    id: true,
                    name: true,
                },
            });
            if (!policy) {
                throw new common_1.NotFoundException(`Policy with ID ${id} not found`);
            }
            await db_1.db.policy.delete({
                where: { id },
            });
            this.logger.log(`Deleted policy: ${policy.name} (${id})`);
            return { success: true, deletedPolicy: policy };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete policy ${id}:`, error);
            throw error;
        }
    }
};
exports.PoliciesService = PoliciesService;
exports.PoliciesService = PoliciesService = PoliciesService_1 = __decorate([
    (0, common_1.Injectable)()
], PoliciesService);
//# sourceMappingURL=policies.service.js.map