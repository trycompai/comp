import {
  CommentEntityType,
  Departments,
  Frequency,
  Impact,
  Likelihood,
  PolicyStatus,
  RiskCategory,
  RiskStatus,
  TaskStatus,
} from '@db';
import { z } from 'zod';

export const organizationSchema = z.object({
  frameworkIds: z
    .array(z.string())
    .min(1, 'Please select at least one framework to get started with'),
});

export type OrganizationSchema = z.infer<typeof organizationSchema>;

export const organizationNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name cannot exceed 255 characters'),
});

export const subdomainAvailabilitySchema = z.object({
  subdomain: z
    .string()
    .min(1, 'Subdomain is required')
    .max(255, 'Subdomain cannot exceed 255 characters')
    .regex(/^[a-z0-9-]+$/, {
      message: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
    }),
});

export const deleteOrganizationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
});

export const sendFeedbackSchema = z.object({
  feedback: z.string(),
});

export const updaterMenuSchema = z.array(
  z.object({
    path: z.string(),
    name: z.string(),
  }),
);

export const organizationWebsiteSchema = z.object({
  website: z
    .string()
    .url({
      message: 'Please enter a valid website that starts with https://',
    })
    .max(255, 'Website cannot exceed 255 characters'),
});

export const organizationAdvancedModeSchema = z.object({
  advancedModeEnabled: z.boolean(),
});

// Risks
export const createRiskSchema = z.object({
  title: z
    .string({ error: 'Risk name is required' })
    .min(1, { message: 'Risk name should be at least 1 character' })
    .max(100, { message: 'Risk name should be at most 100 characters' }),
  description: z
    .string({ error: 'Risk description is required' })
    .min(1, { message: 'Risk description should be at least 1 character' })
    .max(255, { message: 'Risk description should be at most 255 characters' }),
  category: z.nativeEnum(RiskCategory, { error: 'Risk category is required' }),
  department: z.nativeEnum(Departments, { error: 'Risk department is required' }),
  assigneeId: z.string().optional().nullable(),
});

export const updateRiskSchema = z.object({
  id: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  title: z.string().min(1, {
    message: 'Risk title is required',
  }),
  description: z.string().min(1, {
    message: 'Risk description is required',
  }),
  category: z.nativeEnum(RiskCategory, { error: 'Risk category is required' }),
  department: z.nativeEnum(Departments, { error: 'Risk department is required' }),
  assigneeId: z.string().optional().nullable(),
  status: z.nativeEnum(RiskStatus, { error: 'Risk status is required' }),
});

export const createRiskCommentSchema = z.object({
  riskId: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  content: z
    .string()
    .min(1, {
      message: 'Comment content is required',
    })
    .max(1000, {
      message: 'Comment content should be at most 1000 characters',
    })
    .transform((val) => {
      // Remove any HTML tags by applying the replacement repeatedly until no changes occur
      let sanitized = val;
      let previousValue;

      do {
        previousValue = sanitized;
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      } while (sanitized !== previousValue);

      return sanitized;
    }),
});

export const createTaskSchema = z.object({
  riskId: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  title: z.string().min(1, {
    message: 'Task title is required',
  }),
  description: z.string().min(1, {
    message: 'Task description is required',
  }),
  dueDate: z.date().optional(),
  assigneeId: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, {
    message: 'Task ID is required',
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.nativeEnum(TaskStatus, { error: 'Task status is required' }),
  assigneeId: z.string().optional().nullable(),
});

export const createTaskCommentSchema = z.object({
  riskId: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  taskId: z.string().min(1, {
    message: 'Task ID is required',
  }),
  content: z
    .string()
    .min(1, {
      message: 'Comment content is required',
    })
    .max(1000, {
      message: 'Comment content should be at most 1000 characters',
    })
    .transform((val) => {
      // Remove any HTML tags by applying the replacement repeatedly until no changes occur
      let sanitized = val;
      let previousValue;

      do {
        previousValue = sanitized;
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      } while (sanitized !== previousValue);

      return sanitized;
    }),
});

export const uploadTaskFileSchema = z.object({
  riskId: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  taskId: z.string().min(1, {
    message: 'Task ID is required',
  }),
});

// Integrations
export const deleteIntegrationConnectionSchema = z.object({
  integrationName: z.string().min(1, {
    message: 'Integration name is required',
  }),
});

export const createIntegrationSchema = z.object({
  integrationId: z.string().min(1, {
    message: 'Integration ID is required',
  }),
});

// Seed Data
export const seedDataSchema = z.object({
  organizationId: z.string(),
});

export const updateInherentRiskSchema = z.object({
  id: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  probability: z.nativeEnum(Likelihood),
  impact: z.nativeEnum(Impact),
});

export const updateResidualRiskSchema = z.object({
  id: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  probability: z.number().min(1).max(10),
  impact: z.number().min(1).max(10),
});

// ADD START: Schema for enum-based residual risk update
export const updateResidualRiskEnumSchema = z.object({
  id: z.string().min(1, {
    message: 'Risk ID is required',
  }),
  probability: z.nativeEnum(Likelihood),
  impact: z.nativeEnum(Impact),
});
// ADD END

// Policies
export const createPolicySchema = z.object({
  title: z.string({ error: 'Title is required' }).min(1, 'Title is required'),
  description: z.string({ error: 'Description is required' }).min(1, 'Description is required'),
  frameworkIds: z.array(z.string()).optional(),
  controlIds: z.array(z.string()).optional(),
  entityId: z.string().optional(),
});

export type CreatePolicySchema = z.infer<typeof createPolicySchema>;

export const updatePolicySchema = z.object({
  id: z.string(),
  content: z.any(),
  entityId: z.string(),
});

export const addFrameworksSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  frameworkIds: z.array(z.string()).min(1, 'Please select at least one framework to add'),
});

export const assistantSettingsSchema = z.object({
  enabled: z.boolean().optional(),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  department: z.nativeEnum(Departments, { error: 'Department is required' }),
  externalEmployeeId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updatePolicyOverviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  entityId: z.string(),
});

export const updatePolicyFormSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(PolicyStatus),
  assigneeId: z.string().optional().nullable(),
  department: z.nativeEnum(Departments),
  review_frequency: z.nativeEnum(Frequency),
  review_date: z.date(),
  approverId: z.string().optional().nullable(), // Added for selecting an approver
  entityId: z.string(),
});

export const apiKeySchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name is required' })
    .max(64, { message: 'Name must be less than 64 characters' }),
  expiresAt: z.enum(['30days', '90days', '1year', 'never']),
});

export const createPolicyCommentSchema = z.object({
  policyId: z.string().min(1, {
    message: 'Policy ID is required',
  }),
  content: z
    .string()
    .min(1, {
      message: 'Comment content is required',
    })
    .max(1000, {
      message: 'Comment content should be at most 1000 characters',
    })
    .transform((val) => {
      // Remove any HTML tags by applying the replacement repeatedly until no changes occur
      let sanitized = val;
      let previousValue;

      do {
        previousValue = sanitized;
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      } while (sanitized !== previousValue);

      return sanitized;
    }),
});

export const addCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(1000, 'Comment content should be at most 1000 characters')
    .transform((val) => {
      // Remove any HTML tags by applying the replacement repeatedly until no changes occur
      let sanitized = val;
      let previousValue;

      do {
        previousValue = sanitized;
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      } while (sanitized !== previousValue);

      return sanitized;
    }),
  entityId: z.string().min(1, 'Entity ID is required'),
  entityType: z.nativeEnum(CommentEntityType),
});

export const createContextEntrySchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  tags: z.string().optional(), // comma separated
});

export const updateContextEntrySchema = z.object({
  id: z.string().min(1, 'ID is required'),
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  tags: z.string().optional(),
});

export const deleteContextEntrySchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

// Comment schemas for the new generic comments API
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  entityId: z.string(),
  entityType: z.nativeEnum(CommentEntityType),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64
      }),
    )
    .optional(),
});

export type CreateCommentSchema = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  commentId: z.string(),
  content: z.string().min(1, 'Comment content is required'),
});

export type UpdateCommentSchema = z.infer<typeof updateCommentSchema>;

export const deleteCommentSchema = z.object({
  commentId: z.string(),
});

export type DeleteCommentSchema = z.infer<typeof deleteCommentSchema>;
