import { z } from 'zod';

// Extract the enum values directly from Prisma schema
export const TaskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'done',
  'not_relevant',
]);
export const TaskFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
]);
export const DepartmentsSchema = z.enum([
  'none',
  'admin',
  'gov',
  'hr',
  'it',
  'itsm',
  'qms',
]);

// Create Task DTO
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  status: TaskStatusSchema.optional().default('todo'),
  frequency: TaskFrequencySchema.optional(),
  department: DepartmentsSchema.optional().default('none'),
  order: z.number().int().min(0).optional().default(0),
  assigneeId: z.string().optional(),
  taskTemplateId: z.string().optional(),
});

// Update Task DTO - all fields optional
export const UpdateTaskSchema = CreateTaskSchema.partial();

// Query parameters for listing tasks
export const TaskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: TaskStatusSchema.optional(),
  frequency: TaskFrequencySchema.optional(),
  department: DepartmentsSchema.optional(),
  assigneeId: z.string().optional(),
  search: z.string().optional(),
});

// Response DTOs
export const TaskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  frequency: TaskFrequencySchema.nullable(),
  department: DepartmentsSchema.nullable(),
  order: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastCompletedAt: z.date().nullable(),
  assigneeId: z.string().nullable(),
  organizationId: z.string(),
  taskTemplateId: z.string().nullable(),
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

export const PaginatedTasksResponseSchema = z.object({
  tasks: z.array(TaskResponseSchema),
  meta: PaginationMetaSchema,
});

// Infer TypeScript types from Zod schemas
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type TaskQueryDto = z.infer<typeof TaskQuerySchema>;
export type TaskResponseDto = z.infer<typeof TaskResponseSchema>;
export type PaginationMetaDto = z.infer<typeof PaginationMetaSchema>;
export type PaginatedTasksResponseDto = z.infer<
  typeof PaginatedTasksResponseSchema
>;
