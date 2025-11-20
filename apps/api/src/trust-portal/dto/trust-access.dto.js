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
exports.ReclaimAccessDto = exports.ListAccessRequestsDto = exports.AccessRequestStatusFilter = exports.RevokeGrantDto = exports.DenyAccessRequestDto = exports.ApproveAccessRequestDto = exports.CreateAccessRequestDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateAccessRequestDto {
    name;
    email;
    company;
    jobTitle;
    purpose;
    requestedDurationDays;
}
exports.CreateAccessRequestDto = CreateAccessRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAccessRequestDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAccessRequestDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAccessRequestDto.prototype, "company", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAccessRequestDto.prototype, "jobTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateAccessRequestDto.prototype, "purpose", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateAccessRequestDto.prototype, "requestedDurationDays", void 0);
class ApproveAccessRequestDto {
    durationDays;
}
exports.ApproveAccessRequestDto = ApproveAccessRequestDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ApproveAccessRequestDto.prototype, "durationDays", void 0);
class DenyAccessRequestDto {
    reason;
}
exports.DenyAccessRequestDto = DenyAccessRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DenyAccessRequestDto.prototype, "reason", void 0);
class RevokeGrantDto {
    reason;
}
exports.RevokeGrantDto = RevokeGrantDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RevokeGrantDto.prototype, "reason", void 0);
var AccessRequestStatusFilter;
(function (AccessRequestStatusFilter) {
    AccessRequestStatusFilter["UNDER_REVIEW"] = "under_review";
    AccessRequestStatusFilter["APPROVED"] = "approved";
    AccessRequestStatusFilter["DENIED"] = "denied";
    AccessRequestStatusFilter["CANCELED"] = "canceled";
})(AccessRequestStatusFilter || (exports.AccessRequestStatusFilter = AccessRequestStatusFilter = {}));
class ListAccessRequestsDto {
    status;
}
exports.ListAccessRequestsDto = ListAccessRequestsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: AccessRequestStatusFilter }),
    (0, class_validator_1.IsEnum)(AccessRequestStatusFilter),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ListAccessRequestsDto.prototype, "status", void 0);
class ReclaimAccessDto {
    email;
}
exports.ReclaimAccessDto = ReclaimAccessDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReclaimAccessDto.prototype, "email", void 0);
//# sourceMappingURL=trust-access.dto.js.map