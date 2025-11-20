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
exports.CreatePolicyDto = exports.Departments = exports.Frequency = exports.PolicyStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var PolicyStatus;
(function (PolicyStatus) {
    PolicyStatus["DRAFT"] = "draft";
    PolicyStatus["PUBLISHED"] = "published";
    PolicyStatus["NEEDS_REVIEW"] = "needs_review";
})(PolicyStatus || (exports.PolicyStatus = PolicyStatus = {}));
var Frequency;
(function (Frequency) {
    Frequency["MONTHLY"] = "monthly";
    Frequency["QUARTERLY"] = "quarterly";
    Frequency["YEARLY"] = "yearly";
})(Frequency || (exports.Frequency = Frequency = {}));
var Departments;
(function (Departments) {
    Departments["NONE"] = "none";
    Departments["ADMIN"] = "admin";
    Departments["GOV"] = "gov";
    Departments["HR"] = "hr";
    Departments["IT"] = "it";
    Departments["ITSM"] = "itsm";
    Departments["QMS"] = "qms";
})(Departments || (exports.Departments = Departments = {}));
class CreatePolicyDto {
    name;
    description;
    status;
    content;
    frequency;
    department;
    isRequiredToSign;
    reviewDate;
    assigneeId;
    approverId;
    policyTemplateId;
    signedBy;
}
exports.CreatePolicyDto = CreatePolicyDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the policy',
        example: 'Data Privacy Policy',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the policy',
        example: 'This policy outlines how we handle and protect personal data',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Status of the policy',
        enum: PolicyStatus,
        example: PolicyStatus.DRAFT,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PolicyStatus),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "status", void 0);
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
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreatePolicyDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Review frequency of the policy',
        enum: Frequency,
        example: Frequency.YEARLY,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Frequency),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department this policy applies to',
        enum: Departments,
        example: Departments.IT,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(Departments),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether this policy requires a signature',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePolicyDto.prototype, "isRequiredToSign", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Review date for the policy',
        example: '2024-12-31T00:00:00.000Z',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "reviewDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user assigned to this policy',
        example: 'usr_abc123def456',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user who approved this policy',
        example: 'usr_xyz789abc123',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "approverId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the policy template this policy is based on',
        example: 'plt_template123',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePolicyDto.prototype, "policyTemplateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'List of user IDs who have signed this policy',
        example: ['usr_123', 'usr_456'],
        type: 'array',
        items: { type: 'string' },
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreatePolicyDto.prototype, "signedBy", void 0);
//# sourceMappingURL=create-policy.dto.js.map