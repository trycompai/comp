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
exports.DomainStatusResponseDto = exports.DomainVerificationDto = exports.GetDomainStatusDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class GetDomainStatusDto {
    domain;
}
exports.GetDomainStatusDto = GetDomainStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The domain name to check status for',
        example: 'portal.example.com',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'domain cannot be empty' }),
    (0, class_validator_1.Matches)(/^(?!-)[A-Za-z0-9-]+([-.][a-z0-9]+)*\.[A-Za-z]{2,6}$/u, {
        message: 'domain must be a valid domain format',
    }),
    __metadata("design:type", String)
], GetDomainStatusDto.prototype, "domain", void 0);
class DomainVerificationDto {
    type;
    domain;
    value;
    reason;
}
exports.DomainVerificationDto = DomainVerificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Verification type (e.g., TXT, CNAME)' }),
    __metadata("design:type", String)
], DomainVerificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Domain for verification' }),
    __metadata("design:type", String)
], DomainVerificationDto.prototype, "domain", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Verification value' }),
    __metadata("design:type", String)
], DomainVerificationDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for verification status',
        required: false,
    }),
    __metadata("design:type", String)
], DomainVerificationDto.prototype, "reason", void 0);
class DomainStatusResponseDto {
    domain;
    verified;
    verification;
}
exports.DomainStatusResponseDto = DomainStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The domain name' }),
    __metadata("design:type", String)
], DomainStatusResponseDto.prototype, "domain", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the domain is verified' }),
    __metadata("design:type", Boolean)
], DomainStatusResponseDto.prototype, "verified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Verification records for the domain',
        type: [DomainVerificationDto],
        required: false,
    }),
    __metadata("design:type", Array)
], DomainStatusResponseDto.prototype, "verification", void 0);
//# sourceMappingURL=domain-status.dto.js.map