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
exports.TaskResponseDto = exports.AttachmentResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class AttachmentResponseDto {
    id;
    name;
    type;
    size;
    downloadUrl;
    createdAt;
}
exports.AttachmentResponseDto = AttachmentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identifier for the attachment',
        example: 'att_abc123def456',
    }),
    __metadata("design:type", String)
], AttachmentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Original filename',
        example: 'document.pdf',
    }),
    __metadata("design:type", String)
], AttachmentResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File type/MIME type',
        example: 'application/pdf',
    }),
    __metadata("design:type", String)
], AttachmentResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File size in bytes',
        example: 1024000,
    }),
    __metadata("design:type", Number)
], AttachmentResponseDto.prototype, "size", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Signed URL for downloading the file (temporary)',
        example: 'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
    }),
    __metadata("design:type", String)
], AttachmentResponseDto.prototype, "downloadUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Upload timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], AttachmentResponseDto.prototype, "createdAt", void 0);
class TaskResponseDto {
    id;
    title;
    description;
    status;
    createdAt;
    updatedAt;
    taskTemplateId;
}
exports.TaskResponseDto = TaskResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identifier for the task',
        example: 'tsk_abc123def456',
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task title',
        example: 'Implement user authentication',
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task description',
        example: 'Add OAuth 2.0 authentication to the platform',
        required: false,
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task status',
        example: 'in_progress',
        enum: ['todo', 'in_progress', 'done', 'blocked'],
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task creation timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], TaskResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task last update timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], TaskResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task template ID',
        example: 'frk_tt_68406e353df3bc002994acef',
        nullable: true,
        required: false,
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "taskTemplateId", void 0);
//# sourceMappingURL=task-responses.dto.js.map