"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const task_responses_dto_1 = require("./dto/task-responses.dto");
let TasksService = class TasksService {
    constructor() { }
    async getTasks(organizationId) {
        try {
            const tasks = await db_1.db.task.findMany({
                where: {
                    organizationId,
                },
                orderBy: [{ status: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
            });
            return tasks.map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description,
                status: task.status,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
                taskTemplateId: task.taskTemplateId,
            }));
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            throw new common_1.InternalServerErrorException('Failed to fetch tasks');
        }
    }
    async getTask(organizationId, taskId) {
        try {
            const task = await db_1.db.task.findFirst({
                where: {
                    id: taskId,
                    organizationId,
                },
                include: {
                    assignee: true,
                },
            });
            if (!task) {
                throw new common_1.BadRequestException('Task not found or access denied');
            }
            return task;
        }
        catch (error) {
            console.error('Error fetching task:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to fetch task');
        }
    }
    async verifyTaskAccess(organizationId, taskId) {
        const task = await db_1.db.task.findFirst({
            where: {
                id: taskId,
                organizationId,
            },
        });
        if (!task) {
            throw new common_1.BadRequestException('Task not found or access denied');
        }
    }
    async getTaskAutomationRuns(organizationId, taskId) {
        await this.verifyTaskAccess(organizationId, taskId);
        const runs = await db_1.db.evidenceAutomationRun.findMany({
            where: {
                taskId,
            },
            include: {
                evidenceAutomation: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return runs;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TasksService);
//# sourceMappingURL=tasks.service.js.map