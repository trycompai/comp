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

export const getOrganizationSchema = (t: (content: string) => string) =>
  z.object({
    frameworkIds: z
      .array(z.string())
      .min(1, t('Please select at least one framework to get started with')),
  });

export type OrganizationSchema = z.infer<ReturnType<typeof getOrganizationSchema>>;

export const getOrganizationNameSchema = (t: (content: string) => string) =>
  z.object({
    name: z
      .string()
      .min(1, t('Organization name is required'))
      .max(255, t('Organization name cannot exceed 255 characters')),
  });

export const getSubdomainAvailabilitySchema = (t: (content: string) => string) =>
  z.object({
    subdomain: z
      .string()
      .min(1, t('Subdomain is required'))
      .max(255, t('Subdomain cannot exceed 255 characters'))
      .regex(/^[a-z0-9-]+$/, {
        message: t('Subdomain can only contain lowercase letters, numbers, and hyphens'),
      }),
  });

export const getDeleteOrganizationSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string(),
    organizationId: z.string(),
  });

export const getSendFeedbackSchema = (t: (content: string) => string) =>
  z.object({
    feedback: z.string(),
  });

export const getUpdaterMenuSchema = (t: (content: string) => string) =>
  z.array(
    z.object({
      path: z.string(),
      name: z.string(),
    }),
  );

export const getOrganizationWebsiteSchema = (t: (content: string) => string) =>
  z.object({
    website: z
      .string()
      .url({
        message: t('Please enter a valid website that starts with https://'),
      })
      .max(255, t('Website cannot exceed 255 characters')),
  });

// Risks
export const getCreateRiskSchema = (t: (content: string) => string) =>
  z.object({
    title: z
      .string({
        required_error: t('Risk name is required'),
      })
      .min(1, {
        message: t('Risk name should be at least 1 character'),
      })
      .max(100, {
        message: t('Risk name should be at most 100 characters'),
      }),
    description: z
      .string({
        required_error: t('Risk description is required'),
      })
      .min(1, {
        message: t('Risk description should be at least 1 character'),
      })
      .max(255, {
        message: t('Risk description should be at most 255 characters'),
      }),
    category: z.nativeEnum(RiskCategory, {
      required_error: t('Risk category is required'),
    }),
    department: z.nativeEnum(Departments, {
      required_error: t('Risk department is required'),
    }),
    assigneeId: z.string().optional().nullable(),
  });

export const getUpdateRiskSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    title: z.string().min(1, {
      message: t('Risk title is required'),
    }),
    description: z.string().min(1, {
      message: t('Risk description is required'),
    }),
    category: z.nativeEnum(RiskCategory, {
      required_error: t('Risk category is required'),
    }),
    department: z.nativeEnum(Departments, {
      required_error: t('Risk department is required'),
    }),
    assigneeId: z.string().optional().nullable(),
    status: z.nativeEnum(RiskStatus, {
      required_error: t('Risk status is required'),
    }),
  });

export const getCreateRiskCommentSchema = (t: (content: string) => string) =>
  z.object({
    riskId: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    content: z
      .string()
      .min(1, {
        message: t('Comment content is required'),
      })
      .max(1000, {
        message: t('Comment content should be at most 1000 characters'),
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

export const getCreateTaskSchema = (t: (content: string) => string) =>
  z.object({
    riskId: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    title: z.string().min(1, {
      message: t('Task title is required'),
    }),
    description: z.string().min(1, {
      message: t('Task description is required'),
    }),
    dueDate: z.date().optional(),
    assigneeId: z.string().optional().nullable(),
  });

export const getUpdateTaskSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, {
      message: t('Task ID is required'),
    }),
    title: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.date().optional(),
    status: z.nativeEnum(TaskStatus, {
      required_error: t('Task status is required'),
    }),
    assigneeId: z.string().optional().nullable(),
  });

export const getCreateTaskCommentSchema = (t: (content: string) => string) =>
  z.object({
    riskId: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    taskId: z.string().min(1, {
      message: t('Task ID is required'),
    }),
    content: z
      .string()
      .min(1, {
        message: t('Comment content is required'),
      })
      .max(1000, {
        message: t('Comment content should be at most 1000 characters'),
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

export const getUploadTaskFileSchema = (t: (content: string) => string) =>
  z.object({
    riskId: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    taskId: z.string().min(1, {
      message: t('Task ID is required'),
    }),
  });

// Integrations
export const getDeleteIntegrationConnectionSchema = (t: (content: string) => string) =>
  z.object({
    integrationName: z.string().min(1, {
      message: t('Integration name is required'),
    }),
  });

export const getCreateIntegrationSchema = (t: (content: string) => string) =>
  z.object({
    integrationId: z.string().min(1, {
      message: t('Integration ID is required'),
    }),
  });

// Seed Data
export const seedDataSchema = z.object({
  organizationId: z.string(),
});

export const getUpdateInherentRiskSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    probability: z.nativeEnum(Likelihood),
    impact: z.nativeEnum(Impact),
  });

export const getUpdateResidualRiskSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    probability: z.number().min(1).max(10),
    impact: z.number().min(1).max(10),
  });

// ADD START: Schema for enum-based residual risk update
export const getUpdateResidualRiskEnumSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, {
      message: t('Risk ID is required'),
    }),
    probability: z.nativeEnum(Likelihood),
    impact: z.nativeEnum(Impact),
  });

// ADD END

// Policies
export const getCreatePolicySchema = (t: (content: string) => string) =>
  z.object({
    title: z.string({ required_error: t('Title is required') }).min(1, t('Title is required')),
    description: z
      .string({ required_error: t('Description is required') })
      .min(1, t('Description is required')),
    frameworkIds: z.array(z.string()).optional(),
    controlIds: z.array(z.string()).optional(),
    entityId: z.string().optional(),
  });

export type CreatePolicySchema = z.infer<ReturnType<typeof getCreatePolicySchema>>;

export const getUpdatePolicySchema = (t: (content: string) => string) =>
  z.object({
    id: z.string(),
    content: z.any(),
    entityId: z.string(),
  });

export const getAddFrameworksSchema = (t: (content: string) => string) =>
  z.object({
    organizationId: z.string().min(1, t('Organization ID is required')),
    frameworkIds: z.array(z.string()).min(1, t('Please select at least one framework to add')),
  });

export const assistantSettingsSchema = z.object({
  enabled: z.boolean().optional(),
});

export const getCreateEmployeeSchema = (t: (content: string) => string) =>
  z.object({
    name: z.string().min(1, t('Name is required')),
    email: z.string().email(t('Invalid email address')),
    department: z.nativeEnum(Departments, {
      required_error: t('Department is required'),
    }),
    externalEmployeeId: z.string().optional(),
    isActive: z.boolean().default(true),
  });

export const getUpdatePolicyOverviewSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    isRequiredToSign: z.enum(['required', 'not_required']).optional(),
    entityId: z.string(),
  });

export const getUpdatePolicyFormSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string(),
    status: z.nativeEnum(PolicyStatus),
    assigneeId: z.string().optional().nullable(),
    department: z.nativeEnum(Departments),
    review_frequency: z.nativeEnum(Frequency),
    review_date: z.date(),
    isRequiredToSign: z.enum(['required', 'not_required']),
    approverId: z.string().optional().nullable(), // Added for selecting an approver
    entityId: z.string(),
  });

export const getApiKeySchema = (t: (content: string) => string) =>
  z.object({
    name: z
      .string()
      .min(1, { message: t('Name is required') })
      .max(64, { message: t('Name must be less than 64 characters') }),
    expiresAt: z.enum(['30days', '90days', '1year', 'never']),
  });

export const getCreatePolicyCommentSchema = (t: (content: string) => string) =>
  z.object({
    policyId: z.string().min(1, {
      message: t('Policy ID is required'),
    }),
    content: z
      .string()
      .min(1, {
        message: t('Comment content is required'),
      })
      .max(1000, {
        message: t('Comment content should be at most 1000 characters'),
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

export const getAddCommentSchema = (t: (content: string) => string) =>
  z.object({
    content: z
      .string()
      .min(1, t('Comment content is required'))
      .max(1000, t('Comment content should be at most 1000 characters'))
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
    entityId: z.string().min(1, t('Entity ID is required')),
    entityType: z.nativeEnum(CommentEntityType),
  });

export const getCreateContextEntrySchema = (t: (content: string) => string) =>
  z.object({
    question: z.string().min(1, t('Question is required')),
    answer: z.string().min(1, t('Answer is required')),
    tags: z.string().optional(), // comma separated
  });

export const getUpdateContextEntrySchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, t('ID is required')),
    question: z.string().min(1, t('Question is required')),
    answer: z.string().min(1, t('Answer is required')),
    tags: z.string().optional(),
  });

export const getDeleteContextEntrySchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, t('ID is required')),
  });

// Comment schemas for the new generic comments API
export const getCreateCommentSchema = (t: (content: string) => string) =>
  z.object({
    content: z.string().min(1, t('Comment content is required')),
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

export type CreateCommentSchema = z.infer<ReturnType<typeof getCreateCommentSchema>>;

export const getUpdateCommentSchema = (t: (content: string) => string) =>
  z.object({
    commentId: z.string(),
    content: z.string().min(1, t('Comment content is required')),
  });

export type UpdateCommentSchema = z.infer<ReturnType<typeof getUpdateCommentSchema>>;

export const deleteCommentSchema = z.object({
  commentId: z.string(),
});

export type DeleteCommentSchema = z.infer<typeof deleteCommentSchema>;
