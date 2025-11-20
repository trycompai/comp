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
exports.TaskNotFoundResponseDto = exports.UnauthorizedResponseDto = exports.BadRequestResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class BadRequestResponseDto {
    message;
}
exports.BadRequestResponseDto = BadRequestResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error message',
        example: 'Invalid task ID or organization ID',
    }),
    __metadata("design:type", String)
], BadRequestResponseDto.prototype, "message", void 0);
class UnauthorizedResponseDto {
    message;
}
exports.UnauthorizedResponseDto = UnauthorizedResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error message',
        example: 'Unauthorized',
    }),
    __metadata("design:type", String)
], UnauthorizedResponseDto.prototype, "message", void 0);
class TaskNotFoundResponseDto {
    message;
}
exports.TaskNotFoundResponseDto = TaskNotFoundResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error message',
        example: 'Task not found',
    }),
    __metadata("design:type", String)
], TaskNotFoundResponseDto.prototype, "message", void 0);
//# sourceMappingURL=automation-error-responses.dto.js.map