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
exports.AttachmentsService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const db_1 = require("@trycompai/db");
const common_1 = require("@nestjs/common");
const db_2 = require("@trycompai/db");
const crypto_1 = require("crypto");
const task_responses_dto_1 = require("./dto/task-responses.dto");
const upload_attachment_dto_1 = require("./dto/upload-attachment.dto");
let AttachmentsService = class AttachmentsService {
    s3Client;
    bucketName;
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    SIGNED_URL_EXPIRY = 900;
    constructor() {
        this.bucketName = process.env.APP_AWS_BUCKET_NAME;
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.APP_AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    async uploadAttachment(organizationId, entityId, entityType, uploadDto, userId) {
        try {
            const fileBuffer = Buffer.from(uploadDto.fileData, 'base64');
            if (fileBuffer.length > this.MAX_FILE_SIZE_BYTES) {
                throw new common_1.BadRequestException(`File size exceeds maximum allowed size of ${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
            }
            const fileId = (0, crypto_1.randomBytes)(16).toString('hex');
            const sanitizedFileName = this.sanitizeFileName(uploadDto.fileName);
            const timestamp = Date.now();
            const s3Key = `${organizationId}/attachments/${entityType}/${entityId}/${timestamp}-${fileId}-${sanitizedFileName}`;
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: uploadDto.fileType,
                Metadata: {
                    originalFileName: uploadDto.fileName,
                    organizationId,
                    entityId,
                    entityType,
                    ...(userId && { uploadedBy: userId }),
                },
            });
            await this.s3Client.send(putCommand);
            const attachment = await db_2.db.attachment.create({
                data: {
                    name: uploadDto.fileName,
                    url: s3Key,
                    type: this.mapFileTypeToAttachmentType(uploadDto.fileType),
                    entityId,
                    entityType,
                    organizationId,
                },
            });
            const downloadUrl = await this.generateSignedUrl(s3Key);
            return {
                id: attachment.id,
                name: attachment.name,
                type: attachment.type,
                downloadUrl,
                createdAt: attachment.createdAt,
                size: fileBuffer.length,
            };
        }
        catch (error) {
            console.error('Error uploading attachment:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to upload attachment');
        }
    }
    async getAttachments(organizationId, entityId, entityType) {
        const attachments = await db_2.db.attachment.findMany({
            where: {
                organizationId,
                entityId,
                entityType,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        const attachmentsWithUrls = await Promise.all(attachments.map(async (attachment) => {
            const downloadUrl = await this.generateSignedUrl(attachment.url);
            return {
                id: attachment.id,
                name: attachment.name,
                type: attachment.type,
                downloadUrl,
                createdAt: attachment.createdAt,
            };
        }));
        return attachmentsWithUrls;
    }
    async getAttachmentDownloadUrl(organizationId, attachmentId) {
        try {
            const attachment = await db_2.db.attachment.findFirst({
                where: {
                    id: attachmentId,
                    organizationId,
                },
            });
            if (!attachment) {
                throw new common_1.BadRequestException('Attachment not found');
            }
            const downloadUrl = await this.generateSignedUrl(attachment.url);
            return {
                downloadUrl,
                expiresIn: this.SIGNED_URL_EXPIRY,
            };
        }
        catch (error) {
            console.error('Error generating download URL:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to generate download URL');
        }
    }
    async deleteAttachment(organizationId, attachmentId) {
        try {
            const attachment = await db_2.db.attachment.findFirst({
                where: {
                    id: attachmentId,
                    organizationId,
                },
            });
            if (!attachment) {
                throw new common_1.BadRequestException('Attachment not found');
            }
            const deleteCommand = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: attachment.url,
            });
            await this.s3Client.send(deleteCommand);
            await db_2.db.attachment.delete({
                where: {
                    id: attachmentId,
                    organizationId,
                },
            });
        }
        catch (error) {
            console.error('Error deleting attachment:', error);
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Failed to delete attachment');
        }
    }
    async generateSignedUrl(s3Key) {
        const getCommand = new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: s3Key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, getCommand, {
            expiresIn: this.SIGNED_URL_EXPIRY,
        });
    }
    sanitizeFileName(fileName) {
        return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
    mapFileTypeToAttachmentType(fileType) {
        const type = fileType.split('/')[0];
        switch (type) {
            case 'image':
                return db_1.AttachmentType.image;
            case 'video':
                return db_1.AttachmentType.video;
            case 'audio':
                return db_1.AttachmentType.audio;
            case 'application':
            case 'text':
                return db_1.AttachmentType.document;
            default:
                return db_1.AttachmentType.other;
        }
    }
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AttachmentsService);
//# sourceMappingURL=attachments.service.js.map