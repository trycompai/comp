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
exports.UploadAttachmentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
class UploadAttachmentDto {
    fileName;
    fileType;
    fileData;
    description;
}
exports.UploadAttachmentDto = UploadAttachmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the file',
        example: 'document.pdf',
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], UploadAttachmentDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'MIME type of the file',
        example: 'application/pdf',
        enum: ALLOWED_FILE_TYPES,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(ALLOWED_FILE_TYPES, {
        message: `File type must be one of: ${ALLOWED_FILE_TYPES.join(', ')}`,
    }),
    __metadata("design:type", String)
], UploadAttachmentDto.prototype, "fileType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Base64 encoded file data',
        example: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBase64)(),
    __metadata("design:type", String)
], UploadAttachmentDto.prototype, "fileData", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the attachment',
        example: 'Meeting notes from Q4 planning session',
        required: false,
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UploadAttachmentDto.prototype, "description", void 0);
//# sourceMappingURL=upload-attachment.dto.js.map