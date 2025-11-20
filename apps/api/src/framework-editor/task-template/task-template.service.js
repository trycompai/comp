"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TaskTemplateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTemplateService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const update_task_template_dto_1 = require("./dto/update-task-template.dto");
let TaskTemplateService = TaskTemplateService_1 = class TaskTemplateService {
    logger = new common_1.Logger(TaskTemplateService_1.name);
    async findAll() {
        try {
            const taskTemplates = await db_1.db.frameworkEditorTaskTemplate.findMany({
                orderBy: { name: 'asc' },
            });
            this.logger.log(`Retrieved ${taskTemplates.length} framework editor task templates`);
            return taskTemplates;
        }
        catch (error) {
            this.logger.error('Failed to retrieve framework editor task templates:', error);
            throw error;
        }
    }
    async findById(id) {
        try {
            const taskTemplate = await db_1.db.frameworkEditorTaskTemplate.findUnique({
                where: { id },
            });
            if (!taskTemplate) {
                throw new common_1.NotFoundException(`Framework editor task template with ID ${id} not found`);
            }
            this.logger.log(`Retrieved framework editor task template: ${taskTemplate.name} (${id})`);
            return taskTemplate;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve framework editor task template ${id}:`, error);
            throw error;
        }
    }
    async updateById(id, updateDto) {
        try {
            await this.findById(id);
            const updatedTaskTemplate = await db_1.db.frameworkEditorTaskTemplate.update({
                where: { id },
                data: updateDto,
            });
            this.logger.log(`Updated framework editor task template: ${updatedTaskTemplate.name} (${id})`);
            return updatedTaskTemplate;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update framework editor task template ${id}:`, error);
            throw error;
        }
    }
    async deleteById(id) {
        try {
            const existingTaskTemplate = await this.findById(id);
            await db_1.db.frameworkEditorTaskTemplate.delete({
                where: { id },
            });
            this.logger.log(`Deleted framework editor task template: ${existingTaskTemplate.name} (${id})`);
            return {
                message: 'Framework editor task template deleted successfully',
                deletedTaskTemplate: {
                    id: existingTaskTemplate.id,
                    name: existingTaskTemplate.name,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete framework editor task template ${id}:`, error);
            throw error;
        }
    }
};
exports.TaskTemplateService = TaskTemplateService;
exports.TaskTemplateService = TaskTemplateService = TaskTemplateService_1 = __decorate([
    (0, common_1.Injectable)()
], TaskTemplateService);
//# sourceMappingURL=task-template.service.js.map