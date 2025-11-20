"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const create_context_dto_1 = require("./dto/create-context.dto");
const update_context_dto_1 = require("./dto/update-context.dto");
let ContextService = ContextService_1 = class ContextService {
    logger = new common_1.Logger(ContextService_1.name);
    async findAllByOrganization(organizationId) {
        try {
            const contextEntries = await db_1.db.context.findMany({
                where: { organizationId },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Retrieved ${contextEntries.length} context entries for organization ${organizationId}`);
            return contextEntries;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve context entries for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async findById(id, organizationId) {
        try {
            const contextEntry = await db_1.db.context.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });
            if (!contextEntry) {
                throw new common_1.NotFoundException(`Context entry with ID ${id} not found in organization ${organizationId}`);
            }
            this.logger.log(`Retrieved context entry: ${contextEntry.question.substring(0, 50)}... (${id})`);
            return contextEntry;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve context entry ${id}:`, error);
            throw error;
        }
    }
    async create(organizationId, createContextDto) {
        try {
            const contextEntry = await db_1.db.context.create({
                data: {
                    ...createContextDto,
                    organizationId,
                },
            });
            this.logger.log(`Created new context entry: ${contextEntry.question.substring(0, 50)}... (${contextEntry.id}) for organization ${organizationId}`);
            return contextEntry;
        }
        catch (error) {
            this.logger.error(`Failed to create context entry for organization ${organizationId}:`, error);
            throw error;
        }
    }
    async updateById(id, organizationId, updateContextDto) {
        try {
            await this.findById(id, organizationId);
            const updatedContextEntry = await db_1.db.context.update({
                where: { id },
                data: updateContextDto,
            });
            this.logger.log(`Updated context entry: ${updatedContextEntry.question.substring(0, 50)}... (${id})`);
            return updatedContextEntry;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update context entry ${id}:`, error);
            throw error;
        }
    }
    async deleteById(id, organizationId) {
        try {
            const existingContextEntry = await this.findById(id, organizationId);
            await db_1.db.context.delete({
                where: { id },
            });
            this.logger.log(`Deleted context entry: ${existingContextEntry.question.substring(0, 50)}... (${id})`);
            return {
                message: 'Context entry deleted successfully',
                deletedContext: {
                    id: existingContextEntry.id,
                    question: existingContextEntry.question,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete context entry ${id}:`, error);
            throw error;
        }
    }
};
exports.ContextService = ContextService;
exports.ContextService = ContextService = ContextService_1 = __decorate([
    (0, common_1.Injectable)()
], ContextService);
//# sourceMappingURL=context.service.js.map