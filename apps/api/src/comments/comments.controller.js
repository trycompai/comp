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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentsController = void 0;
const db_1 = require("@trycompai/db");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const comments_service_1 = require("./comments.service");
const comment_responses_dto_1 = require("./dto/comment-responses.dto");
const create_comment_dto_1 = require("./dto/create-comment.dto");
const update_comment_dto_1 = require("./dto/update-comment.dto");
let CommentsController = class CommentsController {
    commentsService;
    constructor(commentsService) {
        this.commentsService = commentsService;
    }
    async getComments(organizationId, entityId, entityType) {
        return await this.commentsService.getComments(organizationId, entityId, entityType);
    }
    async createComment(organizationId, authContext, createCommentDto) {
        if (!authContext.userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        return await this.commentsService.createComment(organizationId, authContext.userId, createCommentDto);
    }
    async updateComment(organizationId, authContext, commentId, updateCommentDto) {
        if (!authContext.userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        return await this.commentsService.updateComment(organizationId, commentId, authContext.userId, updateCommentDto.content);
    }
    async deleteComment(organizationId, authContext, commentId) {
        if (!authContext.userId) {
            throw new common_1.BadRequestException('User ID is required');
        }
        await this.commentsService.deleteComment(organizationId, commentId, authContext.userId);
        return {
            success: true,
            deletedCommentId: commentId,
            message: 'Comment deleted successfully',
        };
    }
};
exports.CommentsController = CommentsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get comments for an entity',
        description: 'Retrieve all comments for a specific entity (task, policy, vendor, etc.)',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'entityId',
        description: 'ID of the entity to get comments for',
        example: 'tsk_abc123def456',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'entityType',
        description: 'Type of entity',
        enum: db_1.CommentEntityType,
        example: 'task',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Comments retrieved successfully',
        type: [comment_responses_dto_1.CommentResponseDto],
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Query)('entityId')),
    __param(2, (0, common_1.Query)('entityType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, typeof (_a = typeof db_1.CommentEntityType !== "undefined" && db_1.CommentEntityType) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new comment',
        description: 'Create a comment on an entity with optional file attachments',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Comment created successfully',
        type: comment_responses_dto_1.CommentResponseDto,
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_comment_dto_1.CreateCommentDto]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "createComment", null);
__decorate([
    (0, common_1.Put)(':commentId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a comment',
        description: 'Update the content of an existing comment (author only)',
    }),
    (0, swagger_1.ApiParam)({
        name: 'commentId',
        description: 'Unique comment identifier',
        example: 'cmt_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Comment updated successfully',
        type: comment_responses_dto_1.CommentResponseDto,
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Param)('commentId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, update_comment_dto_1.UpdateCommentDto]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "updateComment", null);
__decorate([
    (0, common_1.Delete)(':commentId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a comment',
        description: 'Delete a comment and all its attachments (author only)',
    }),
    (0, swagger_1.ApiParam)({
        name: 'commentId',
        description: 'Unique comment identifier',
        example: 'cmt_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Comment deleted successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        deletedCommentId: { type: 'string', example: 'cmt_abc123def456' },
                        message: {
                            type: 'string',
                            example: 'Comment deleted successfully',
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
        description: 'Comment not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Comment with ID cmt_abc123def456 not found',
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], CommentsController.prototype, "deleteComment", null);
exports.CommentsController = CommentsController = __decorate([
    (0, swagger_1.ApiTags)('Comments'),
    (0, common_1.Controller)({ path: 'comments', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [comments_service_1.CommentsService])
], CommentsController);
//# sourceMappingURL=comments.controller.js.map