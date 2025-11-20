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
exports.MemberResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class MemberResponseDto {
    id;
    userId;
    role;
    department;
    isActive;
    fleetDmLabelId;
    organizationId;
    createdAt;
}
exports.MemberResponseDto = MemberResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member ID',
        example: 'mem_abc123def456',
    }),
    __metadata("design:type", String)
], MemberResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID associated with member',
        example: 'usr_abc123def456',
    }),
    __metadata("design:type", String)
], MemberResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member role',
        example: 'admin',
    }),
    __metadata("design:type", String)
], MemberResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member department',
        example: 'engineering',
        nullable: true,
    }),
    __metadata("design:type", String)
], MemberResponseDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether member is active',
        example: true,
    }),
    __metadata("design:type", Boolean)
], MemberResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'FleetDM label ID for member devices',
        example: 123,
        nullable: true,
    }),
    __metadata("design:type", Number)
], MemberResponseDto.prototype, "fleetDmLabelId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID this member belongs to',
        example: 'org_abc123def456',
    }),
    __metadata("design:type", String)
], MemberResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the member was created',
        example: '2024-01-01T00:00:00Z',
    }),
    __metadata("design:type", Date)
], MemberResponseDto.prototype, "createdAt", void 0);
//# sourceMappingURL=member-responses.dto.js.map