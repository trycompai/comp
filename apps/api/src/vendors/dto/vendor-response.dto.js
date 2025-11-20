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
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const db_1 = require("@trycompai/db");
class VendorResponseDto {
    id;
    name;
    description;
    category;
    status;
    inherentProbability;
    inherentImpact;
    residualProbability;
    residualImpact;
    website;
    organizationId;
    assigneeId;
    createdAt;
    updatedAt;
}
exports.VendorResponseDto = VendorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor ID',
        example: 'vnd_abc123def456',
    }),
    __metadata("design:type", String)
], VendorResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor name',
        example: 'CloudTech Solutions Inc.',
    }),
    __metadata("design:type", String)
], VendorResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the vendor and services provided',
        example: 'Cloud infrastructure provider offering AWS-like services including compute, storage, and networking solutions for enterprise customers.',
    }),
    __metadata("design:type", String)
], VendorResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor category',
        enum: db_1.VendorCategory,
        example: db_1.VendorCategory.cloud,
    }),
    __metadata("design:type", typeof (_a = typeof db_1.VendorCategory !== "undefined" && db_1.VendorCategory) === "function" ? _a : Object)
], VendorResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Assessment status of the vendor',
        enum: db_1.VendorStatus,
        example: db_1.VendorStatus.not_assessed,
    }),
    __metadata("design:type", typeof (_b = typeof db_1.VendorStatus !== "undefined" && db_1.VendorStatus) === "function" ? _b : Object)
], VendorResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Inherent probability of risk before controls',
        enum: db_1.Likelihood,
        example: db_1.Likelihood.possible,
    }),
    __metadata("design:type", typeof (_c = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _c : Object)
], VendorResponseDto.prototype, "inherentProbability", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Inherent impact of risk before controls',
        enum: db_1.Impact,
        example: db_1.Impact.moderate,
    }),
    __metadata("design:type", typeof (_d = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _d : Object)
], VendorResponseDto.prototype, "inherentImpact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual probability after controls are applied',
        enum: db_1.Likelihood,
        example: db_1.Likelihood.unlikely,
    }),
    __metadata("design:type", typeof (_e = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _e : Object)
], VendorResponseDto.prototype, "residualProbability", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual impact after controls are applied',
        enum: db_1.Impact,
        example: db_1.Impact.minor,
    }),
    __metadata("design:type", typeof (_f = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _f : Object)
], VendorResponseDto.prototype, "residualImpact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor website URL',
        nullable: true,
        example: 'https://www.cloudtechsolutions.com',
    }),
    __metadata("design:type", String)
], VendorResponseDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID',
        example: 'org_abc123def456',
    }),
    __metadata("design:type", String)
], VendorResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user assigned to manage this vendor',
        nullable: true,
        example: 'mem_abc123def456',
    }),
    __metadata("design:type", String)
], VendorResponseDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the vendor was created',
        type: String,
        format: 'date-time',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], VendorResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the vendor was last updated',
        type: String,
        format: 'date-time',
        example: '2024-01-16T14:45:00Z',
    }),
    __metadata("design:type", Date)
], VendorResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=vendor-response.dto.js.map