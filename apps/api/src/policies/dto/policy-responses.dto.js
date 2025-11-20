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
exports.PolicyResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_policy_dto_1 = require("./create-policy.dto");
class PolicyResponseDto {
    id;
    name;
    description;
    status;
    content;
    frequency;
    department;
    isRequiredToSign;
    signedBy;
    reviewDate;
    isArchived;
    createdAt;
    updatedAt;
    lastArchivedAt;
    lastPublishedAt;
    organizationId;
    assigneeId;
    approverId;
    policyTemplateId;
}
exports.PolicyResponseDto = PolicyResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The policy ID',
        example: 'pol_abc123def456',
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the policy',
        example: 'Data Privacy Policy',
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the policy',
        example: 'This policy outlines how we handle and protect personal data',
        nullable: true,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status of the policy',
        enum: create_policy_dto_1.PolicyStatus,
        example: create_policy_dto_1.PolicyStatus.DRAFT,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Content of the policy as TipTap JSON (array of nodes)',
        example: [
            {
                type: 'heading',
                attrs: { level: 2, textAlign: null },
                content: [{ type: 'text', text: 'Purpose' }],
            },
            {
                type: 'paragraph',
                attrs: { textAlign: null },
                content: [
                    {
                        type: 'text',
                        text: 'Verify workforce integrity and grant the right access at start, revoke at end.',
                    },
                ],
            },
        ],
        type: 'array',
        items: { type: 'object', additionalProperties: true },
    }),
    __metadata("design:type", Array)
], PolicyResponseDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Review frequency of the policy',
        enum: create_policy_dto_1.Frequency,
        example: create_policy_dto_1.Frequency.YEARLY,
        nullable: true,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department this policy applies to',
        enum: create_policy_dto_1.Departments,
        example: create_policy_dto_1.Departments.IT,
        nullable: true,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether this policy requires a signature',
        example: true,
    }),
    __metadata("design:type", Boolean)
], PolicyResponseDto.prototype, "isRequiredToSign", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'List of user IDs who have signed this policy',
        example: ['usr_123', 'usr_456'],
        type: 'array',
        items: { type: 'string' },
    }),
    __metadata("design:type", Array)
], PolicyResponseDto.prototype, "signedBy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Review date for the policy',
        example: '2024-12-31T00:00:00.000Z',
        nullable: true,
    }),
    __metadata("design:type", Date)
], PolicyResponseDto.prototype, "reviewDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether this policy is archived',
        example: false,
    }),
    __metadata("design:type", Boolean)
], PolicyResponseDto.prototype, "isArchived", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the policy was created',
        example: '2024-01-01T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], PolicyResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the policy was last updated',
        example: '2024-01-15T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], PolicyResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the policy was last archived',
        example: '2024-02-01T00:00:00.000Z',
        nullable: true,
    }),
    __metadata("design:type", Date)
], PolicyResponseDto.prototype, "lastArchivedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the policy was last published',
        example: '2024-01-10T00:00:00.000Z',
        nullable: true,
    }),
    __metadata("design:type", Date)
], PolicyResponseDto.prototype, "lastPublishedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID this policy belongs to',
        example: 'org_abc123def456',
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user assigned to this policy',
        example: 'usr_abc123def456',
        nullable: true,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user who approved this policy',
        example: 'usr_xyz789abc123',
        nullable: true,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "approverId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the policy template this policy is based on',
        example: 'plt_template123',
        nullable: true,
    }),
    __metadata("design:type", String)
], PolicyResponseDto.prototype, "policyTemplateId", void 0);
//# sourceMappingURL=policy-responses.dto.js.map