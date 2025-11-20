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
exports.CreatePeopleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const db_1 = require("@trycompai/db");
class CreatePeopleDto {
    userId;
    role;
    department;
    isActive;
    fleetDmLabelId;
}
exports.CreatePeopleDto = CreatePeopleDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User ID to associate with this member',
        example: 'usr_abc123def456',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePeopleDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Role for the member',
        example: 'admin',
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePeopleDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Member department',
        enum: db_1.Departments,
        example: db_1.Departments.it,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Departments),
    __metadata("design:type", typeof (_a = typeof db_1.Departments !== "undefined" && db_1.Departments) === "function" ? _a : Object)
], CreatePeopleDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether member is active',
        example: true,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePeopleDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'FleetDM label ID for member devices',
        example: 123,
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreatePeopleDto.prototype, "fleetDmLabelId", void 0);
//# sourceMappingURL=create-people.dto.js.map