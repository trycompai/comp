"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationsService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const update_automation_dto_1 = require("./dto/update-automation.dto");
let AutomationsService = class AutomationsService {
    async findByTaskId(taskId) {
        const automations = await db_1.db.evidenceAutomation.findMany({
            where: {
                taskId: taskId,
            },
            include: {
                runs: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return {
            success: true,
            automations,
        };
    }
    async findById(automationId) {
        const automation = await db_1.db.evidenceAutomation.findFirst({
            where: {
                id: automationId,
            },
        });
        if (!automation) {
            throw new common_1.NotFoundException('Automation not found');
        }
        return {
            success: true,
            automation,
        };
    }
    async create(organizationId, taskId) {
        const task = await db_1.db.task.findFirst({
            where: {
                id: taskId,
                organizationId: organizationId,
            },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        const automation = await db_1.db.evidenceAutomation.create({
            data: {
                name: `${task.title} - Evidence Collection`,
                taskId: taskId,
            },
        });
        return {
            success: true,
            automation: {
                id: automation.id,
                name: automation.name,
            },
        };
    }
    async update(automationId, updateAutomationDto) {
        const existingAutomation = await db_1.db.evidenceAutomation.findFirst({
            where: {
                id: automationId,
            },
        });
        if (!existingAutomation) {
            throw new common_1.NotFoundException('Automation not found');
        }
        const automation = await db_1.db.evidenceAutomation.update({
            where: {
                id: automationId,
            },
            data: updateAutomationDto,
        });
        return {
            success: true,
            automation: {
                id: automation.id,
                name: automation.name,
                description: automation.description,
            },
        };
    }
    async delete(automationId) {
        const existingAutomation = await db_1.db.evidenceAutomation.findFirst({
            where: {
                id: automationId,
            },
        });
        if (!existingAutomation) {
            throw new common_1.NotFoundException('Automation not found');
        }
        await db_1.db.evidenceAutomation.delete({
            where: {
                id: automationId,
            },
        });
        return {
            success: true,
            message: 'Automation deleted successfully',
        };
    }
    async listVersions(automationId, limit, offset) {
        const versions = await db_1.db.evidenceAutomationVersion.findMany({
            where: {
                evidenceAutomationId: automationId,
            },
            orderBy: {
                version: 'desc',
            },
            ...(limit && { take: limit }),
            ...(offset && { skip: offset }),
        });
        return {
            success: true,
            versions,
        };
    }
};
exports.AutomationsService = AutomationsService;
exports.AutomationsService = AutomationsService = __decorate([
    (0, common_1.Injectable)()
], AutomationsService);
//# sourceMappingURL=automations.service.js.map