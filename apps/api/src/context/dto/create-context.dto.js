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
exports.CreateContextDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateContextDto {
    question;
    answer;
    tags;
}
exports.CreateContextDto = CreateContextDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The question or topic this context entry addresses',
        example: 'How do we handle user authentication in our application?',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateContextDto.prototype, "question", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The answer or detailed explanation for the question',
        example: 'We use a hybrid authentication system supporting both API keys and session-based authentication. API keys are used for programmatic access while sessions are used for web interface interactions.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateContextDto.prototype, "answer", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Tags to categorize and help search this context entry',
        example: ['authentication', 'security', 'api', 'sessions'],
        required: false,
        type: [String],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateContextDto.prototype, "tags", void 0);
//# sourceMappingURL=create-context.dto.js.map