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
exports.ContextResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ContextResponseDto {
    id;
    organizationId;
    question;
    answer;
    tags;
    createdAt;
    updatedAt;
}
exports.ContextResponseDto = ContextResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identifier for the context entry',
        example: 'ctx_abc123def456',
    }),
    __metadata("design:type", String)
], ContextResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID this context entry belongs to',
        example: 'org_xyz789uvw012',
    }),
    __metadata("design:type", String)
], ContextResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The question or topic this context entry addresses',
        example: 'How do we handle user authentication in our application?',
    }),
    __metadata("design:type", String)
], ContextResponseDto.prototype, "question", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The answer or detailed explanation for the question',
        example: 'We use a hybrid authentication system supporting both API keys and session-based authentication.',
    }),
    __metadata("design:type", String)
], ContextResponseDto.prototype, "answer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tags to categorize and help search this context entry',
        example: ['authentication', 'security', 'api', 'sessions'],
        type: [String],
    }),
    __metadata("design:type", Array)
], ContextResponseDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Timestamp when the context entry was created',
        example: '2024-01-15T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], ContextResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Timestamp when the context entry was last updated',
        example: '2024-01-15T14:20:00.000Z',
    }),
    __metadata("design:type", Date)
], ContextResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=context-response.dto.js.map