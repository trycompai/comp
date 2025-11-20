"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginatedTasksResponseSchema = exports.PaginationMetaSchema = exports.TaskResponseSchema = exports.TaskQuerySchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.DepartmentsSchema = exports.TaskFrequencySchema = exports.TaskStatusSchema = void 0;
const zod_1 = require("zod");
exports.TaskStatusSchema = zod_1.z.enum([
    'todo',
    'in_progress',
    'done',
    'not_relevant',
]);
exports.TaskFrequencySchema = zod_1.z.enum([
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'yearly',
]);
exports.DepartmentsSchema = zod_1.z.enum([
    'none',
    'admin',
    'gov',
    'hr',
    'it',
    'itsm',
    'qms',
]);
exports.CreateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    status: exports.TaskStatusSchema.optional().default('todo'),
    frequency: exports.TaskFrequencySchema.optional(),
    department: exports.DepartmentsSchema.optional().default('none'),
    order: zod_1.z.number().int().min(0).optional().default(0),
    assigneeId: zod_1.z.string().optional(),
    taskTemplateId: zod_1.z.string().optional(),
});
exports.UpdateTaskSchema = exports.CreateTaskSchema.partial();
exports.TaskQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
    status: exports.TaskStatusSchema.optional(),
    frequency: exports.TaskFrequencySchema.optional(),
    department: exports.DepartmentsSchema.optional(),
    assigneeId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
exports.TaskResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    status: exports.TaskStatusSchema,
    frequency: exports.TaskFrequencySchema.nullable(),
    department: exports.DepartmentsSchema.nullable(),
    order: zod_1.z.number(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    lastCompletedAt: zod_1.z.date().nullable(),
    assigneeId: zod_1.z.string().nullable(),
    organizationId: zod_1.z.string(),
    taskTemplateId: zod_1.z.string().nullable(),
});
exports.PaginationMetaSchema = zod_1.z.object({
    page: zod_1.z.number(),
    limit: zod_1.z.number(),
    total: zod_1.z.number(),
    totalPages: zod_1.z.number(),
    hasNextPage: zod_1.z.boolean(),
    hasPrevPage: zod_1.z.boolean(),
});
exports.PaginatedTasksResponseSchema = zod_1.z.object({
    tasks: zod_1.z.array(exports.TaskResponseSchema),
    meta: exports.PaginationMetaSchema,
});
//# sourceMappingURL=task.schemas.js.map