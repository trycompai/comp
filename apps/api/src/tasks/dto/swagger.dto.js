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
exports.PaginatedTasksResponseDto = exports.PaginationMetaDto = exports.TaskResponseDto = exports.TaskQueryDto = exports.UpdateTaskDto = exports.CreateTaskDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class CreateTaskDto {
    title;
    description;
    status;
    frequency;
    department;
    order;
    assigneeId;
    taskTemplateId;
}
exports.CreateTaskDto = CreateTaskDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task title',
        example: 'Review security policies',
    }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task description',
        example: 'Conduct quarterly review of all security policies and procedures',
    }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task status',
        enum: ['todo', 'in_progress', 'done', 'not_relevant'],
        default: 'todo',
        required: false,
    }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task frequency',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: false,
    }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department assignment',
        enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
        default: 'none',
        required: false,
    }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task order for sorting',
        default: 0,
        required: false,
    }),
    __metadata("design:type", Number)
], CreateTaskDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assignee member ID', required: false }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Task template ID', required: false }),
    __metadata("design:type", String)
], CreateTaskDto.prototype, "taskTemplateId", void 0);
class UpdateTaskDto {
    title;
    description;
    status;
    frequency;
    department;
    order;
    assigneeId;
    taskTemplateId;
}
exports.UpdateTaskDto = UpdateTaskDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task title',
        example: 'Review security policies',
        required: false,
    }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task description',
        example: 'Conduct quarterly review of all security policies and procedures',
        required: false,
    }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task status',
        enum: ['todo', 'in_progress', 'done', 'not_relevant'],
        required: false,
    }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task frequency',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: false,
    }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department assignment',
        enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
        required: false,
    }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Task order for sorting', required: false }),
    __metadata("design:type", Number)
], UpdateTaskDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assignee member ID', required: false }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Task template ID', required: false }),
    __metadata("design:type", String)
], UpdateTaskDto.prototype, "taskTemplateId", void 0);
class TaskQueryDto {
    page;
    limit;
    status;
    frequency;
    department;
    assigneeId;
    search;
}
exports.TaskQueryDto = TaskQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Page number (1-based)',
        default: 1,
        required: false,
    }),
    __metadata("design:type", Number)
], TaskQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Number of items per page',
        default: 20,
        required: false,
    }),
    __metadata("design:type", Number)
], TaskQueryDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by status',
        enum: ['todo', 'in_progress', 'done', 'not_relevant'],
        required: false,
    }),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by frequency',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: false,
    }),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Filter by department',
        enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
        required: false,
    }),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Filter by assignee ID', required: false }),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search tasks by title or description',
        required: false,
    }),
    __metadata("design:type", String)
], TaskQueryDto.prototype, "search", void 0);
class TaskResponseDto {
    id;
    title;
    description;
    status;
    frequency;
    department;
    order;
    createdAt;
    updatedAt;
    lastCompletedAt;
    assigneeId;
    organizationId;
    taskTemplateId;
}
exports.TaskResponseDto = TaskResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Task ID', example: 'tsk_abc123def456' }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task title',
        example: 'Review security policies',
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task description',
        example: 'Conduct quarterly review of all security policies and procedures',
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task status',
        enum: ['todo', 'in_progress', 'done', 'not_relevant'],
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Task frequency',
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        nullable: true,
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "frequency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Department assignment',
        enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
        nullable: true,
    }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "department", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Task order for sorting' }),
    __metadata("design:type", Number)
], TaskResponseDto.prototype, "order", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Creation date' }),
    __metadata("design:type", Date)
], TaskResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last update date' }),
    __metadata("design:type", Date)
], TaskResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Last completion date', nullable: true }),
    __metadata("design:type", Date)
], TaskResponseDto.prototype, "lastCompletedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Assignee member ID', nullable: true }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "assigneeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Organization ID' }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "organizationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Task template ID', nullable: true }),
    __metadata("design:type", String)
], TaskResponseDto.prototype, "taskTemplateId", void 0);
class PaginationMetaDto {
    page;
    limit;
    total;
    totalPages;
    hasNextPage;
    hasPrevPage;
}
exports.PaginationMetaDto = PaginationMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Current page number' }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of items per page' }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of items' }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of pages' }),
    __metadata("design:type", Number)
], PaginationMetaDto.prototype, "totalPages", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether there are more pages' }),
    __metadata("design:type", Boolean)
], PaginationMetaDto.prototype, "hasNextPage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether there are previous pages' }),
    __metadata("design:type", Boolean)
], PaginationMetaDto.prototype, "hasPrevPage", void 0);
class PaginatedTasksResponseDto {
    tasks;
    meta;
}
exports.PaginatedTasksResponseDto = PaginatedTasksResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TaskResponseDto], description: 'Array of tasks' }),
    __metadata("design:type", Array)
], PaginatedTasksResponseDto.prototype, "tasks", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: PaginationMetaDto, description: 'Pagination metadata' }),
    __metadata("design:type", PaginationMetaDto)
], PaginatedTasksResponseDto.prototype, "meta", void 0);
//# sourceMappingURL=swagger.dto.js.map