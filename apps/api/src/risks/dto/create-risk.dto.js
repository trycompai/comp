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
var _a, _b, _c, _d, _e, _f, _g, _h;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRiskDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const db_1 = require("@trycompai/db");
class CreateRiskDto {
    title;
    description;
    category;
    department;
    status;
    likelihood;
    impact;
    residualLikelihood;
    residualImpact;
    treatmentStrategyDescription;
    treatmentStrategy;
    assigneeId;
}
exports.CreateRiskDto = CreateRiskDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk title',
        example: 'Data breach vulnerability in user authentication system',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRiskDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the risk',
        example: 'Weak password requirements could lead to unauthorized access to user accounts',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRiskDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk category',
        enum: db_1.RiskCategory,
        example: db_1.RiskCategory.technology,
    }),
    (0, class_validator_1.IsEnum)(db_1.RiskCategory),
    __metadata("design:type", typeof (_a = typeof db_1.RiskCategory !== "undefined" && db_1.RiskCategory) === "function" ? _a : Object)
], CreateRiskDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department responsible for the risk',
        enum: db_1.Departments,
        required: false,
        example: db_1.Departments.it,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Departments),
    __metadata("design:type", typeof (_b = typeof db_1.Departments !== "undefined" && db_1.Departments) === "function" ? _b : Object)
], CreateRiskDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current status of the risk',
        enum: db_1.RiskStatus,
        default: db_1.RiskStatus.open,
        example: db_1.RiskStatus.open,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.RiskStatus),
    __metadata("design:type", typeof (_c = typeof db_1.RiskStatus !== "undefined" && db_1.RiskStatus) === "function" ? _c : Object)
], CreateRiskDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Likelihood of the risk occurring',
        enum: db_1.Likelihood,
        default: db_1.Likelihood.very_unlikely,
        example: db_1.Likelihood.possible,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Likelihood),
    __metadata("design:type", typeof (_d = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _d : Object)
], CreateRiskDto.prototype, "likelihood", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Impact if the risk materializes',
        enum: db_1.Impact,
        default: db_1.Impact.insignificant,
        example: db_1.Impact.major,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Impact),
    __metadata("design:type", typeof (_e = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _e : Object)
], CreateRiskDto.prototype, "impact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual likelihood after treatment',
        enum: db_1.Likelihood,
        default: db_1.Likelihood.very_unlikely,
        example: db_1.Likelihood.unlikely,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Likelihood),
    __metadata("design:type", typeof (_f = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _f : Object)
], CreateRiskDto.prototype, "residualLikelihood", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual impact after treatment',
        enum: db_1.Impact,
        default: db_1.Impact.insignificant,
        example: db_1.Impact.minor,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.Impact),
    __metadata("design:type", typeof (_g = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _g : Object)
], CreateRiskDto.prototype, "residualImpact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the treatment strategy',
        required: false,
        example: 'Implement multi-factor authentication and strengthen password requirements',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRiskDto.prototype, "treatmentStrategyDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk treatment strategy',
        enum: db_1.RiskTreatmentType,
        default: db_1.RiskTreatmentType.accept,
        example: db_1.RiskTreatmentType.mitigate,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(db_1.RiskTreatmentType),
    __metadata("design:type", typeof (_h = typeof db_1.RiskTreatmentType !== "undefined" && db_1.RiskTreatmentType) === "function" ? _h : Object)
], CreateRiskDto.prototype, "treatmentStrategy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user assigned to this risk',
        required: false,
        example: 'mem_abc123def456',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRiskDto.prototype, "assigneeId", void 0);
//# sourceMappingURL=create-risk.dto.js.map