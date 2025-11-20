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
exports.TasksController = void 0;
const db_1 = require("@trycompai/db");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const attachments_service_1 = require("../attachments/attachments.service");
const upload_attachment_dto_1 = require("../attachments/upload-attachment.dto");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const task_responses_dto_1 = require("./dto/task-responses.dto");
const tasks_service_1 = require("./tasks.service");
let TasksController = class TasksController {
    tasksService;
    attachmentsService;
    constructor(tasksService, attachmentsService) {
        this.tasksService = tasksService;
        this.attachmentsService = attachmentsService;
    }
    async getTasks(organizationId) {
        return await this.tasksService.getTasks(organizationId);
    }
    async getTask(organizationId, taskId) {
        return await this.tasksService.getTask(organizationId, taskId);
    }
    async getTaskAttachments(organizationId, taskId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return await this.attachmentsService.getAttachments(organizationId, taskId, db_1.AttachmentEntityType.task);
    }
    async uploadTaskAttachment(authContext, taskId, uploadDto) {
        await this.tasksService.verifyTaskAccess(authContext.organizationId, taskId);
        if (!authContext.userId) {
            throw new common_1.BadRequestException('User ID is required for file upload');
        }
        return await this.attachmentsService.uploadAttachment(authContext.organizationId, taskId, db_1.AttachmentEntityType.task, uploadDto, authContext.userId);
    }
    async getTaskAttachmentDownloadUrl(organizationId, taskId, attachmentId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        return await this.attachmentsService.getAttachmentDownloadUrl(organizationId, attachmentId);
    }
    async deleteTaskAttachment(organizationId, taskId, attachmentId) {
        await this.tasksService.verifyTaskAccess(organizationId, taskId);
        await this.attachmentsService.deleteAttachment(organizationId, attachmentId);
        return {
            success: true,
            deletedAttachmentId: attachmentId,
            message: 'Attachment deleted successfully',
        };
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all tasks',
        description: 'Retrieve all tasks for the authenticated organization',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Tasks retrieved successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/TaskResponseDto' },
                },
                example: [
                    {
                        id: 'tsk_abc123def456',
                        title: 'Implement user authentication',
                        description: 'Add OAuth 2.0 authentication to the platform',
                        status: 'in_progress',
                        createdAt: '2024-01-15T10:30:00Z',
                        updatedAt: '2024-01-15T10:30:00Z',
                    },
                ],
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid authentication',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: { message: { type: 'string', example: 'Unauthorized' } },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getTasks", null);
__decorate([
    (0, common_1.Get)(':taskId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get task by ID',
        description: 'Retrieve a specific task by its ID',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Task retrieved successfully',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/TaskResponseDto' },
                example: {
                    id: 'tsk_abc123def456',
                    title: 'Implement user authentication',
                    description: 'Add OAuth 2.0 authentication to the platform',
                    status: 'in_progress',
                    createdAt: '2024-01-15T10:30:00Z',
                    updatedAt: '2024-01-15T10:30:00Z',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Task not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Task with ID tsk_abc123def456 not found',
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
], TasksController.prototype, "getTask", null);
__decorate([
    (0, common_1.Get)(':taskId/attachments'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get task attachments',
        description: 'Retrieve all attachments for a specific task',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Attachments retrieved successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/AttachmentResponseDto' },
                },
                example: [
                    {
                        id: 'att_abc123def456',
                        name: 'evidence.pdf',
                        type: 'application/pdf',
                        size: 123456,
                        downloadUrl: 'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
                        createdAt: '2024-01-15T10:30:00Z',
                    },
                ],
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid authentication',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: { message: { type: 'string', example: 'Unauthorized' } },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Task not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Task with ID tsk_abc123def456 not found',
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
], TasksController.prototype, "getTaskAttachments", null);
__decorate([
    (0, common_1.Post)(':taskId/attachments'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload attachment to task',
        description: 'Upload a file attachment to a specific task',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Attachment uploaded successfully',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/AttachmentResponseDto' },
                example: {
                    id: 'att_abc123def456',
                    entityId: 'tsk_abc123def456',
                    entityType: 'task',
                    fileName: 'evidence.pdf',
                    fileType: 'application/pdf',
                    fileSize: 123456,
                    createdAt: '2024-01-01T00:00:00Z',
                    createdBy: 'usr_abc123def456',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid file data or file too large',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'File exceeds maximum allowed size',
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid authentication',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: { message: { type: 'string', example: 'Unauthorized' } },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Task not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Task with ID tsk_abc123def456 not found',
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.AuthContext)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upload_attachment_dto_1.UploadAttachmentDto]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "uploadTaskAttachment", null);
__decorate([
    (0, common_1.Get)(':taskId/attachments/:attachmentId/download'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get attachment download URL',
        description: 'Generate a signed URL for downloading a task attachment',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiParam)({
        name: 'attachmentId',
        description: 'Unique attachment identifier',
        example: 'att_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Download URL generated successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        downloadUrl: {
                            type: 'string',
                            description: 'Signed URL for downloading the file',
                            example: 'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
                        },
                        expiresIn: {
                            type: 'number',
                            description: 'URL expiration time in seconds',
                            example: 900,
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid authentication',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: { message: { type: 'string', example: 'Unauthorized' } },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Task or attachment not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Task or attachment not found',
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getTaskAttachmentDownloadUrl", null);
__decorate([
    (0, common_1.Delete)(':taskId/attachments/:attachmentId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete task attachment',
        description: 'Delete a specific attachment from a task',
    }),
    (0, swagger_1.ApiParam)({
        name: 'taskId',
        description: 'Unique task identifier',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiParam)({
        name: 'attachmentId',
        description: 'Unique attachment identifier',
        example: 'att_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Attachment deleted successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        deletedAttachmentId: {
                            type: 'string',
                            example: 'att_abc123def456',
                        },
                        message: {
                            type: 'string',
                            example: 'Attachment deleted successfully',
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Task or attachment not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Task or attachment not found',
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Unauthorized - Invalid authentication',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: { message: { type: 'string', example: 'Unauthorized' } },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('taskId')),
    __param(2, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "deleteTaskAttachment", null);
exports.TasksController = TasksController = __decorate([
    (0, swagger_1.ApiTags)('Tasks'),
    (0, swagger_1.ApiExtraModels)(task_responses_dto_1.TaskResponseDto, task_responses_dto_1.AttachmentResponseDto),
    (0, common_1.Controller)({ path: 'tasks', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [tasks_service_1.TasksService,
        attachments_service_1.AttachmentsService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map