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
exports.CreateTaskTemplateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const db_1 = require("@trycompai/db");
class CreateTaskTemplateDto {
    name;
    description;
    frequency;
    department;
}
exports.CreateTaskTemplateDto = CreateTaskTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task template name',
        example: 'Monthly Security Review',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the task template',
        example: 'Review and update security policies on a monthly basis',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTaskTemplateDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Frequency of the task',
        enum: db_1.Frequency,
        example: db_1.Frequency.monthly,
    }),
    (0, class_validator_1.IsEnum)(db_1.Frequency),
    __metadata("design:type", typeof (_a = typeof db_1.Frequency !== "undefined" && db_1.Frequency) === "function" ? _a : Object)
], CreateTaskTemplateDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department responsible for the task',
        enum: db_1.Departments,
        example: db_1.Departments.it,
    }),
    (0, class_validator_1.IsEnum)(db_1.Departments),
    __metadata("design:type", typeof (_b = typeof db_1.Departments !== "undefined" && db_1.Departments) === "function" ? _b : Object)
], CreateTaskTemplateDto.prototype, "department", void 0);
//# sourceMappingURL=create-task-template.dto.js.map