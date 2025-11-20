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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskTemplateResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const db_1 = require("@trycompai/db");
class TaskTemplateResponseDto {
    id;
    name;
    description;
    frequency;
    department;
    createdAt;
    updatedAt;
}
exports.TaskTemplateResponseDto = TaskTemplateResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task template ID',
        example: 'frk_tt_abc123def456',
    }),
    __metadata("design:type", String)
], TaskTemplateResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task template name',
        example: 'Monthly Security Review',
    }),
    __metadata("design:type", String)
], TaskTemplateResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the task template',
        example: 'Review and update security policies on a monthly basis',
    }),
    __metadata("design:type", String)
], TaskTemplateResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Frequency of the task',
        enum: db_1.Frequency,
        example: db_1.Frequency.monthly,
    }),
    __metadata("design:type", typeof (_a = typeof db_1.Frequency !== "undefined" && db_1.Frequency) === "function" ? _a : Object)
], TaskTemplateResponseDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department responsible for the task',
        enum: db_1.Departments,
        example: db_1.Departments.it,
    }),
    __metadata("design:type", typeof (_b = typeof db_1.Departments !== "undefined" && db_1.Departments) === "function" ? _b : Object)
], TaskTemplateResponseDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Creation timestamp',
        example: '2025-01-01T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], TaskTemplateResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Last update timestamp',
        example: '2025-01-01T00:00:00.000Z',
    }),
    __metadata("design:type", Date)
], TaskTemplateResponseDto.prototype, "updatedAt", void 0);
//# sourceMappingURL=task-template-response.dto.js.map