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
exports.CommentResponseDto = exports.AuthorResponseDto = exports.AttachmentMetadataDto = exports.AttachmentResponseDto = void 0;
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
class AttachmentMetadataDto {
    id;
    name;
    type;
    createdAt;
}
exports.AttachmentMetadataDto = AttachmentMetadataDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identifier for the attachment',
        example: 'att_abc123def456',
    }),
    __metadata("design:type", String)
], AttachmentMetadataDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Original filename',
        example: 'document.pdf',
    }),
    __metadata("design:type", String)
], AttachmentMetadataDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'File type/MIME type',
        example: 'application/pdf',
    }),
    __metadata("design:type", String)
], AttachmentMetadataDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Upload timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], AttachmentMetadataDto.prototype, "createdAt", void 0);
class AuthorResponseDto {
    id;
    name;
    email;
    image;
}
exports.AuthorResponseDto = AuthorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID',
        example: 'usr_abc123def456',
    }),
    __metadata("design:type", String)
], AuthorResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User name',
        example: 'John Doe',
    }),
    __metadata("design:type", String)
], AuthorResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User email',
        example: 'john.doe@company.com',
    }),
    __metadata("design:type", String)
], AuthorResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User profile image URL',
        example: 'https://example.com/avatar.jpg',
        nullable: true,
    }),
    __metadata("design:type", String)
], AuthorResponseDto.prototype, "image", void 0);
class CommentResponseDto {
    id;
    content;
    author;
    attachments;
    createdAt;
}
exports.CommentResponseDto = CommentResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identifier for the comment',
        example: 'cmt_abc123def456',
    }),
    __metadata("design:type", String)
], CommentResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comment content',
        example: 'This task needs to be completed by end of week',
    }),
    __metadata("design:type", String)
], CommentResponseDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comment author information',
        type: AuthorResponseDto,
    }),
    __metadata("design:type", AuthorResponseDto)
], CommentResponseDto.prototype, "author", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Attachment metadata (URLs generated on-demand)',
        type: [AttachmentMetadataDto],
    }),
    __metadata("design:type", Array)
], CommentResponseDto.prototype, "attachments", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Comment creation timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], CommentResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=comment-responses.dto.js.map