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
exports.CreateVendorDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const db_1 = require("@trycompai/db");
class CreateVendorDto {
    name;
    description;
    category;
    status;
    inherentProbability;
    inherentImpact;
    residualProbability;
    residualImpact;
    website;
    assigneeId;
}
exports.CreateVendorDto = CreateVendorDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor name',
        example: 'CloudTech Solutions Inc.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVendorDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the vendor and services provided',
        example: 'Cloud infrastructure provider offering AWS-like services including compute, storage, and networking solutions for enterprise customers.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateVendorDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor category',
        enum: db_1.VendorCategory,
        default: db_1.VendorCategory.other,
        example: db_1.VendorCategory.cloud,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.VendorCategory),
    __metadata("design:type", typeof (_a = typeof db_1.VendorCategory !== "undefined" && db_1.VendorCategory) === "function" ? _a : Object)
], CreateVendorDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Assessment status of the vendor',
        enum: db_1.VendorStatus,
        default: db_1.VendorStatus.not_assessed,
        example: db_1.VendorStatus.not_assessed,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.VendorStatus),
    __metadata("design:type", typeof (_b = typeof db_1.VendorStatus !== "undefined" && db_1.VendorStatus) === "function" ? _b : Object)
], CreateVendorDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Inherent probability of risk before controls',
        enum: db_1.Likelihood,
        default: db_1.Likelihood.very_unlikely,
        example: db_1.Likelihood.possible,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Likelihood),
    __metadata("design:type", typeof (_c = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _c : Object)
], CreateVendorDto.prototype, "inherentProbability", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Inherent impact of risk before controls',
        enum: db_1.Impact,
        default: db_1.Impact.insignificant,
        example: db_1.Impact.moderate,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Impact),
    __metadata("design:type", typeof (_d = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _d : Object)
], CreateVendorDto.prototype, "inherentImpact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual probability after controls are applied',
        enum: db_1.Likelihood,
        default: db_1.Likelihood.very_unlikely,
        example: db_1.Likelihood.unlikely,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Likelihood),
    __metadata("design:type", typeof (_e = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _e : Object)
], CreateVendorDto.prototype, "residualProbability", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual impact after controls are applied',
        enum: db_1.Impact,
        default: db_1.Impact.insignificant,
        example: db_1.Impact.minor,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Impact),
    __metadata("design:type", typeof (_f = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _f : Object)
], CreateVendorDto.prototype, "residualImpact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Vendor website URL',
        required: false,
        example: 'https://www.cloudtechsolutions.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateVendorDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user assigned to manage this vendor',
        required: false,
        example: 'mem_abc123def456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateVendorDto.prototype, "assigneeId", void 0);
//# sourceMappingURL=create-vendor.dto.js.map