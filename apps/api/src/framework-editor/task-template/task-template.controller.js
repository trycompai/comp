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
exports.TaskTemplateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../../auth/hybrid-auth.guard");
const update_task_template_dto_1 = require("./dto/update-task-template.dto");
const task_template_service_1 = require("./task-template.service");
const validate_id_pipe_1 = require("./pipes/validate-id.pipe");
const task_template_operations_1 = require("./schemas/task-template-operations");
const task_template_params_1 = require("./schemas/task-template-params");
const task_template_bodies_1 = require("./schemas/task-template-bodies");
const get_all_task_templates_responses_1 = require("./schemas/get-all-task-templates.responses");
const get_task_template_by_id_responses_1 = require("./schemas/get-task-template-by-id.responses");
const update_task_template_responses_1 = require("./schemas/update-task-template.responses");
const delete_task_template_responses_1 = require("./schemas/delete-task-template.responses");
let TaskTemplateController = class TaskTemplateController {
    taskTemplateService;
    constructor(taskTemplateService) {
        this.taskTemplateService = taskTemplateService;
    }
    async getAllTaskTemplates() {
        return await this.taskTemplateService.findAll();
    }
    async getTaskTemplateById(taskTemplateId, authContext) {
        const taskTemplate = await this.taskTemplateService.findById(taskTemplateId);
        return {
            ...taskTemplate,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async updateTaskTemplate(taskTemplateId, updateTaskTemplateDto, authContext) {
        const updatedTaskTemplate = await this.taskTemplateService.updateById(taskTemplateId, updateTaskTemplateDto);
        return {
            ...updatedTaskTemplate,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async deleteTaskTemplate(taskTemplateId, authContext) {
        const result = await this.taskTemplateService.deleteById(taskTemplateId);
        return {
            ...result,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
};
exports.TaskTemplateController = TaskTemplateController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)(task_template_operations_1.TASK_TEMPLATE_OPERATIONS.getAllTaskTemplates),
    (0, swagger_1.ApiResponse)(get_all_task_templates_responses_1.GET_ALL_TASK_TEMPLATES_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_all_task_templates_responses_1.GET_ALL_TASK_TEMPLATES_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_all_task_templates_responses_1.GET_ALL_TASK_TEMPLATES_RESPONSES[500]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaskTemplateController.prototype, "getAllTaskTemplates", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)(task_template_operations_1.TASK_TEMPLATE_OPERATIONS.getTaskTemplateById),
    (0, swagger_1.ApiParam)(task_template_params_1.TASK_TEMPLATE_PARAMS.taskTemplateId),
    (0, swagger_1.ApiResponse)(get_task_template_by_id_responses_1.GET_TASK_TEMPLATE_BY_ID_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_task_template_by_id_responses_1.GET_TASK_TEMPLATE_BY_ID_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_task_template_by_id_responses_1.GET_TASK_TEMPLATE_BY_ID_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_task_template_by_id_responses_1.GET_TASK_TEMPLATE_BY_ID_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id', validate_id_pipe_1.ValidateIdPipe)),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TaskTemplateController.prototype, "getTaskTemplateById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)(task_template_operations_1.TASK_TEMPLATE_OPERATIONS.updateTaskTemplate),
    (0, swagger_1.ApiParam)(task_template_params_1.TASK_TEMPLATE_PARAMS.taskTemplateId),
    (0, swagger_1.ApiBody)(task_template_bodies_1.TASK_TEMPLATE_BODIES.updateTaskTemplate),
    (0, swagger_1.ApiResponse)(update_task_template_responses_1.UPDATE_TASK_TEMPLATE_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_task_template_responses_1.UPDATE_TASK_TEMPLATE_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_task_template_responses_1.UPDATE_TASK_TEMPLATE_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_task_template_responses_1.UPDATE_TASK_TEMPLATE_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(update_task_template_responses_1.UPDATE_TASK_TEMPLATE_RESPONSES[500]),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    })),
    __param(0, (0, common_1.Param)('id', validate_id_pipe_1.ValidateIdPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_task_template_dto_1.UpdateTaskTemplateDto, Object]),
    __metadata("design:returntype", Promise)
], TaskTemplateController.prototype, "updateTaskTemplate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)(task_template_operations_1.TASK_TEMPLATE_OPERATIONS.deleteTaskTemplate),
    (0, swagger_1.ApiParam)(task_template_params_1.TASK_TEMPLATE_PARAMS.taskTemplateId),
    (0, swagger_1.ApiResponse)(delete_task_template_responses_1.DELETE_TASK_TEMPLATE_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(delete_task_template_responses_1.DELETE_TASK_TEMPLATE_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(delete_task_template_responses_1.DELETE_TASK_TEMPLATE_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(delete_task_template_responses_1.DELETE_TASK_TEMPLATE_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id', validate_id_pipe_1.ValidateIdPipe)),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TaskTemplateController.prototype, "deleteTaskTemplate", null);
exports.TaskTemplateController = TaskTemplateController = __decorate([
    (0, swagger_1.ApiTags)('Framework Editor Task Templates'),
    (0, common_1.Controller)({ path: 'framework-editor/task-template', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [task_template_service_1.TaskTemplateService])
], TaskTemplateController);
//# sourceMappingURL=task-template.controller.js.map