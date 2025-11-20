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
exports.CreateAutomationResponseDto = exports.AutomationResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class AutomationResponseDto {
    id;
    name;
    taskId;
    organizationId;
    status;
    createdAt;
    updatedAt;
}
exports.AutomationResponseDto = AutomationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Automation ID',
        example: 'auto_abc123def456',
    }),
    __metadata("design:type", String)
], AutomationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Automation name',
        example: 'Task Name - Evidence Collection',
    }),
    __metadata("design:type", String)
], AutomationResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task ID this automation belongs to',
        example: 'tsk_abc123def456',
    }),
    __metadata("design:type", String)
], AutomationResponseDto.prototype, "taskId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID',
        example: 'org_abc123def456',
    }),
    __metadata("design:type", String)
], AutomationResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Automation status',
        example: 'active',
        enum: ['active', 'inactive', 'draft'],
    }),
    __metadata("design:type", String)
], AutomationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Creation timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], AutomationResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last update timestamp',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], AutomationResponseDto.prototype, "updatedAt", void 0);
class CreateAutomationResponseDto {
    success;
    automation;
}
exports.CreateAutomationResponseDto = CreateAutomationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Success status',
        example: true,
    }),
    __metadata("design:type", Boolean)
], CreateAutomationResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Created automation details',
        type: () => AutomationResponseDto,
    }),
    __metadata("design:type", Object)
], CreateAutomationResponseDto.prototype, "automation", void 0);
//# sourceMappingURL=automation-responses.dto.js.map