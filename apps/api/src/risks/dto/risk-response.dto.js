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
exports.RiskResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const db_1 = require("@trycompai/db");
class RiskResponseDto {
    id;
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
    organizationId;
    createdAt;
    updatedAt;
    assigneeId;
}
exports.RiskResponseDto = RiskResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk ID',
        example: 'rsk_abc123def456',
    }),
    __metadata("design:type", String)
], RiskResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk title',
        example: 'Data breach vulnerability in user authentication system',
    }),
    __metadata("design:type", String)
], RiskResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detailed description of the risk',
        example: 'Weak password requirements could lead to unauthorized access to user accounts',
    }),
    __metadata("design:type", String)
], RiskResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk category',
        enum: db_1.RiskCategory,
        example: db_1.RiskCategory.technology,
    }),
    __metadata("design:type", typeof (_a = typeof db_1.RiskCategory !== "undefined" && db_1.RiskCategory) === "function" ? _a : Object)
], RiskResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department responsible for the risk',
        enum: db_1.Departments,
        nullable: true,
        example: db_1.Departments.it,
    }),
    __metadata("design:type", typeof (_b = typeof db_1.Departments !== "undefined" && db_1.Departments) === "function" ? _b : Object)
], RiskResponseDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Current status of the risk',
        enum: db_1.RiskStatus,
        example: db_1.RiskStatus.open,
    }),
    __metadata("design:type", typeof (_c = typeof db_1.RiskStatus !== "undefined" && db_1.RiskStatus) === "function" ? _c : Object)
], RiskResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Likelihood of the risk occurring',
        enum: db_1.Likelihood,
        example: db_1.Likelihood.possible,
    }),
    __metadata("design:type", typeof (_d = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _d : Object)
], RiskResponseDto.prototype, "likelihood", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Impact if the risk materializes',
        enum: db_1.Impact,
        example: db_1.Impact.major,
    }),
    __metadata("design:type", typeof (_e = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _e : Object)
], RiskResponseDto.prototype, "impact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual likelihood after treatment',
        enum: db_1.Likelihood,
        example: db_1.Likelihood.unlikely,
    }),
    __metadata("design:type", typeof (_f = typeof db_1.Likelihood !== "undefined" && db_1.Likelihood) === "function" ? _f : Object)
], RiskResponseDto.prototype, "residualLikelihood", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Residual impact after treatment',
        enum: db_1.Impact,
        example: db_1.Impact.minor,
    }),
    __metadata("design:type", typeof (_g = typeof db_1.Impact !== "undefined" && db_1.Impact) === "function" ? _g : Object)
], RiskResponseDto.prototype, "residualImpact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Description of the treatment strategy',
        nullable: true,
        example: 'Implement multi-factor authentication and strengthen password requirements',
    }),
    __metadata("design:type", String)
], RiskResponseDto.prototype, "treatmentStrategyDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Risk treatment strategy',
        enum: db_1.RiskTreatmentType,
        example: db_1.RiskTreatmentType.mitigate,
    }),
    __metadata("design:type", typeof (_h = typeof db_1.RiskTreatmentType !== "undefined" && db_1.RiskTreatmentType) === "function" ? _h : Object)
], RiskResponseDto.prototype, "treatmentStrategy", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Organization ID',
        example: 'org_abc123def456',
    }),
    __metadata("design:type", String)
], RiskResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the risk was created',
        type: String,
        format: 'date-time',
        example: '2024-01-15T10:30:00Z',
    }),
    __metadata("design:type", Date)
], RiskResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'When the risk was last updated',
        type: String,
        format: 'date-time',
        example: '2024-01-16T14:45:00Z',
    }),
    __metadata("design:type", Date)
], RiskResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'ID of the user assigned to this risk',
        example: 'usr_123abc456def',
        nullable: true,
    }),
    __metadata("design:type", String)
], RiskResponseDto.prototype, "assigneeId", void 0);
//# sourceMappingURL=risk-response.dto.js.map