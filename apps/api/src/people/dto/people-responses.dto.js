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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeopleResponseDto = exports.UserResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const db_1 = require("@trycompai/db");
class UserResponseDto {
    id;
    name;
    email;
    emailVerified;
    image;
    createdAt;
    updatedAt;
    lastLogin;
}
exports.UserResponseDto = UserResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID',
        example: 'usr_abc123def456',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User name',
        example: 'John Doe',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User email',
        example: 'john.doe@company.com',
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether email is verified',
        example: true,
    }),
    __metadata("design:type", Boolean)
], UserResponseDto.prototype, "emailVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User profile image URL',
        example: 'https://example.com/avatar.jpg',
        nullable: true,
    }),
    __metadata("design:type", String)
], UserResponseDto.prototype, "image", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the user was created',
        example: '2024-01-01T00:00:00Z',
    }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the user was last updated',
        example: '2024-01-15T00:00:00Z',
    }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last login time',
        example: '2024-01-15T12:00:00Z',
        nullable: true,
    }),
    __metadata("design:type", Date)
], UserResponseDto.prototype, "lastLogin", void 0);
class PeopleResponseDto {
    id;
    organizationId;
    userId;
    role;
    createdAt;
    department;
    isActive;
    fleetDmLabelId;
    user;
}
exports.PeopleResponseDto = PeopleResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member ID',
        example: 'mem_abc123def456',
    }),
    __metadata("design:type", String)
], PeopleResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID this member belongs to',
        example: 'org_abc123def456',
    }),
    __metadata("design:type", String)
], PeopleResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID associated with member',
        example: 'usr_abc123def456',
    }),
    __metadata("design:type", String)
], PeopleResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member role',
        example: 'admin',
    }),
    __metadata("design:type", String)
], PeopleResponseDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the member was created',
        example: '2024-01-01T00:00:00Z',
    }),
    __metadata("design:type", Date)
], PeopleResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member department',
        enum: db_1.Departments,
        example: db_1.Departments.it,
    }),
    __metadata("design:type", typeof (_a = typeof db_1.Departments !== "undefined" && db_1.Departments) === "function" ? _a : Object)
], PeopleResponseDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether member is active',
        example: true,
    }),
    __metadata("design:type", Boolean)
], PeopleResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'FleetDM label ID for member devices',
        example: 123,
        nullable: true,
    }),
    __metadata("design:type", Number)
], PeopleResponseDto.prototype, "fleetDmLabelId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User information',
        type: UserResponseDto,
    }),
    __metadata("design:type", UserResponseDto)
], PeopleResponseDto.prototype, "user", void 0);
//# sourceMappingURL=people-responses.dto.js.map