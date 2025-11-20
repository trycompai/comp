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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../../auth/hybrid-auth.guard");
const tasks_service_1 = require("../tasks.service");
const automations_service_1 = require("./automations.service");
const update_automation_dto_1 = require("./dto/update-automation.dto");
const automation_operations_1 = require("./schemas/automation-operations");
const create_automation_responses_1 = require("./schemas/create-automation.responses");
const update_automation_responses_1 = require("./schemas/update-automation.responses");
let AutomationsController = class AutomationsController {
    automationsService;
    tasksService;
    constructor(automationsService, tasksService) {
        this.automationsService = automationsService;
        this.tasksService = tasksService;
    }
    async getTaskAutomations(organizationId, taskId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return this.automationsService.findByTaskId(taskId);
    }
    async getAutomation(organizationId, taskId, automationId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return this.automationsService.findById(automationId);
    }
    async createAutomation(organizationId, taskId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return this.automationsService.create(organizationId, taskId);
    }
    async updateAutomation(organizationId, taskId, automationId, updateAutomationDto) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return this.automationsService.update(automationId, updateAutomationDto);
    }
    async deleteAutomation(organizationId, taskId, automationId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return this.automationsService.delete(automationId);
    }
    async getAutomationVersions(organizationId, taskId, automationId, limit, offset) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        const parsedLimit = limit ? parseInt(limit) : undefined;
        const parsedOffset = offset ? parseInt(offset) : undefined;
        return this.automationsService.listVersions(automationId, parsedLimit, parsedOffset);
    }
    async getTaskAutomationRuns(organizationId, taskId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return await this.tasksService.getTaskAutomationRuns(organizationId, taskId);
    }
};
exports.AutomationsController = AutomationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all automations for a task',
        description: 'Retrieve all automations for a specific task',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Automations retrieved successfully',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "getTaskAutomations", null);
__decorate([
    (0, common_1.Get)(':automationId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get automation details',
        description: 'Retrieve details for a specific automation',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiParam)({
        name: 'automationId',
        description: 'Unique automation identifier',
        example: 'auto_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Automation details retrieved successfully',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Param)('automationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "getAutomation", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)(automation_operations_1.AUTOMATION_OPERATIONS.createAutomation),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiResponse)(create_automation_responses_1.CREATE_AUTOMATION_RESPONSES[201]),
    (0, swagger_1.ApiResponse)(create_automation_responses_1.CREATE_AUTOMATION_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(create_automation_responses_1.CREATE_AUTOMATION_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(create_automation_responses_1.CREATE_AUTOMATION_RESPONSES[404]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "createAutomation", null);
__decorate([
    (0, common_1.Patch)(':automationId'),
    (0, swagger_1.ApiOperation)(automation_operations_1.AUTOMATION_OPERATIONS.updateAutomation),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiParam)({
        name: 'automationId',
        description: 'Unique automation identifier',
        example: 'auto_abc123def456',
    }),
    (0, swagger_1.ApiResponse)(update_automation_responses_1.UPDATE_AUTOMATION_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_automation_responses_1.UPDATE_AUTOMATION_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_automation_responses_1.UPDATE_AUTOMATION_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_automation_responses_1.UPDATE_AUTOMATION_RESPONSES[404]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Param)('automationId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_automation_dto_1.UpdateAutomationDto]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "updateAutomation", null);
__decorate([
    (0, common_1.Delete)(':automationId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete an automation',
        description: 'Delete a specific automation and all its associated data',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiParam)({
        name: 'automationId',
        description: 'Unique automation identifier',
        example: 'auto_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Automation deleted successfully',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Param)('automationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "deleteAutomation", null);
__decorate([
    (0, common_1.Get)(':automationId/versions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all versions for an automation',
        description: 'Retrieve all published versions of an automation script',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Task ID',
    }),
    (0, swagger_1.ApiParam)({
        name: 'automationId',
        description: 'Automation ID',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Versions retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                versions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            version: { type: 'number' },
                            scriptKey: { type: 'string' },
                            changelog: { type: 'string', nullable: true },
                            publishedBy: { type: 'string', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Param)('automationId')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "getAutomationVersions", null);
__decorate([
    (0, common_1.Get)('runs'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all automation runs for a task',
        description: 'Retrieve all evidence automation runs across automations for a specific task',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Task ID',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Automation runs retrieved successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', example: 'ear_abc123def456' },
                            status: {
                                type: 'string',
                                enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'],
                            },
                            trigger: {
                                type: 'string',
                                enum: ['MANUAL', 'SCHEDULED', 'EVENT'],
                            },
                            createdAt: { type: 'string', format: 'date-time' },
                            completedAt: {
                                type: 'string',
                                format: 'date-time',
                                nullable: true,
                            },
                            error: { type: 'object', nullable: true },
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AutomationsController.prototype, "getTaskAutomationRuns", null);
exports.AutomationsController = AutomationsController = __decorate([
    (0, swagger_1.ApiTags)('Task Automations'),
    (0, common_1.Controller)({ path: 'tasks/:taskId/automations', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [automations_service_1.AutomationsService,
        tasks_service_1.TasksService])
], AutomationsController);
//# sourceMappingURL=automations.controller.js.map