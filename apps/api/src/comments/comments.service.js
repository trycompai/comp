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
exports.CommentsService = void 0;
const db_1 = require("@trycompai/db");
const common_1 = require("@nestjs/common");
const db_2 = require("@trycompai/db");
const attachments_service_1 = require("../attachments/attachments.service");
const comment_responses_dto_1 = require("./dto/comment-responses.dto");
const create_comment_dto_1 = require("./dto/create-comment.dto");
let CommentsService = class CommentsService {
    attachmentsService;
    constructor(attachmentsService) {
        this.attachmentsService = attachmentsService;
    }
    async validateEntityAccess(organizationId, entityId, entityType) {
        let entityExists = false;
        switch (entityType) {
            case db_1.CommentEntityType.task: {
                const task = await db_2.db.task.findFirst({
                    where: { id: entityId, organizationId },
                });
                entityExists = !!task;
                break;
            }
            case db_1.CommentEntityType.policy: {
                const policy = await db_2.db.policy.findFirst({
                    where: { id: entityId, organizationId },
                });
                entityExists = !!policy;
                break;
            }
            case db_1.CommentEntityType.vendor: {
                const vendor = await db_2.db.vendor.findFirst({
                    where: { id: entityId, organizationId },
                });
                entityExists = !!vendor;
                break;
            }
            case db_1.CommentEntityType.risk: {
                const risk = await db_2.db.risk.findFirst({
                    where: { id: entityId, organizationId },
                });
                entityExists = !!risk;
                break;
            }
            default:
                throw new common_1.BadRequestException(`Unsupported entity type: ${entityType}`);
        }
        if (!entityExists) {
            throw new common_1.BadRequestException(`${entityType} not found or access denied`);
        }
    }
    async getComments(organizationId, entityId, entityType) {
        try {
            await this.validateEntityAccess(organizationId, entityId, entityType);
            const comments = await db_2.db.comment.findMany({
                where: {
                    organizationId,
                    entityId,
                    entityType,
                },
                include: {
                    author: {
                        include: {
                            user: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const commentsWithAttachments = await Promise.all(comments.map(async (comment) => {
                const attachments = await this.attachmentsService.getAttachmentMetadata(organizationId, comment.id, db_1.AttachmentEntityType.comment);
                return {
                    id: comment.id,
                    content: comment.content,
                    author: {
                        id: comment.author.user.id,
                        name: comment.author.user.name,
                        email: comment.author.user.email,
                        image: comment.author.user.image,
                    },
                    attachments,
                    createdAt: comment.createdAt,
                };
            }));
            return commentsWithAttachments;
        }
        catch (error) {
            console.error('Error fetching comments:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to fetch comments');
        }
    }
    async createComment(organizationId, userId, createCommentDto) {
        try {
            await this.validateEntityAccess(organizationId, createCommentDto.entityId, createCommentDto.entityType);
            const member = await db_2.db.member.findFirst({
                where: {
                    userId,
                    organizationId,
                },
                include: {
                    user: true,
                },
            });
            if (!member) {
                throw new common_1.BadRequestException('User is not a member of this organization');
            }
            const result = await db_2.db.$transaction(async (tx) => {
                const comment = await tx.comment.create({
                    data: {
                        content: createCommentDto.content,
                        entityId: createCommentDto.entityId,
                        entityType: createCommentDto.entityType,
                        organizationId,
                        authorId: member.id,
                    },
                });
                const attachments = [];
                if (createCommentDto.attachments &&
                    createCommentDto.attachments.length > 0) {
                    for (const attachmentDto of createCommentDto.attachments) {
                        const attachment = await this.attachmentsService.uploadAttachment(organizationId, comment.id, db_1.AttachmentEntityType.comment, attachmentDto, userId);
                        attachments.push(attachment);
                    }
                }
                return {
                    comment,
                    attachments,
                };
            });
            return {
                id: result.comment.id,
                content: result.comment.content,
                author: {
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                    image: member.user.image,
                },
                attachments: result.attachments,
                createdAt: result.comment.createdAt,
            };
        }
        catch (error) {
            console.error('Error creating comment:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to create comment');
        }
    }
    async updateComment(organizationId, commentId, userId, content) {
        try {
            const existingComment = await db_2.db.comment.findFirst({
                where: {
                    id: commentId,
                    organizationId,
                },
                include: {
                    author: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
            if (!existingComment) {
                throw new common_1.BadRequestException('Comment not found or access denied');
            }
            if (existingComment.author.userId !== userId) {
                throw new common_1.BadRequestException('You can only edit your own comments');
            }
            const updatedComment = await db_2.db.comment.update({
                where: {
                    id: commentId,
                    organizationId,
                },
                data: {
                    content,
                },
            });
            const attachments = await this.attachmentsService.getAttachments(organizationId, commentId, db_1.AttachmentEntityType.comment);
            return {
                id: updatedComment.id,
                content: updatedComment.content,
                author: {
                    id: existingComment.author.user.id,
                    name: existingComment.author.user.name,
                    email: existingComment.author.user.email,
                    image: existingComment.author.user.image,
                },
                attachments,
                createdAt: updatedComment.createdAt,
            };
        }
        catch (error) {
            console.error('Error updating comment:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to update comment');
        }
    }
    async deleteComment(organizationId, commentId, userId) {
        try {
            const existingComment = await db_2.db.comment.findFirst({
                where: {
                    id: commentId,
                    organizationId,
                },
                include: {
                    author: {
                        include: {
                            user: true,
                        },
                    },
                },
            });
            if (!existingComment) {
                throw new common_1.BadRequestException('Comment not found or access denied');
            }
            if (existingComment.author.userId !== userId) {
                throw new common_1.BadRequestException('You can only delete your own comments');
            }
            await db_2.db.$transaction(async (tx) => {
                const attachments = await tx.attachment.findMany({
                    where: {
                        organizationId,
                        entityId: commentId,
                        entityType: db_1.AttachmentEntityType.comment,
                    },
                });
                for (const attachment of attachments) {
                    await this.attachmentsService.deleteAttachment(organizationId, attachment.id);
                }
                await tx.comment.delete({
                    where: {
                        id: commentId,
                        organizationId,
                    },
                });
            });
        }
        catch (error) {
            console.error('Error deleting comment:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to delete comment');
        }
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map