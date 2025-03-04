import {
  Departments,
  Frequency,
  PolicyStatus,
  RiskCategory,
  RiskStatus,
  RiskTaskStatus,
  VendorCategory,
  VendorStatus,
} from "@bubba/db";
import { z } from "zod";

export const organizationSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  name: z.string().min(1, "Name is required"),
  website: z.string().url("Must be a valid URL"),
  subdomain: z.string().min(1, "Subdomain is required").optional(),
});

export const organizationNameSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(255, "Organization name cannot exceed 255 characters"),
});

export const subdomainAvailabilitySchema = z.object({
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .max(255, "Subdomain cannot exceed 255 characters")
    .regex(/^[a-z0-9-]+$/, {
      message:
        "Subdomain can only contain lowercase letters, numbers, and hyphens",
    }),
});

export const uploadSchema = z.object({
  file: z.instanceof(File),
  organizationId: z.string().uuid(),
});

export const deleteOrganizationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export const sendFeedbackSchema = z.object({
  feedback: z.string(),
});

export const updaterMenuSchema = z.array(
  z.object({
    path: z.string(),
    name: z.string(),
  })
);

export const organizationWebsiteSchema = z.object({
  website: z.string().url().max(255),
});

// Risks
export const createRiskSchema = z.object({
  title: z
    .string({
      required_error: "Risk name is required",
    })
    .min(1, {
      message: "Risk name should be at least 1 character",
    })
    .max(100, {
      message: "Risk name should be at most 100 characters",
    }),
  description: z
    .string({
      required_error: "Risk description is required",
    })
    .min(1, {
      message: "Risk description should be at least 1 character",
    })
    .max(255, {
      message: "Risk description should be at most 255 characters",
    }),
  category: z.nativeEnum(RiskCategory, {
    required_error: "Risk category is required",
  }),
  department: z.nativeEnum(Departments, {
    required_error: "Risk department is required",
  }),
  ownerId: z.string({
    required_error: "You must assign an owner to the risk",
  }),
});

export const updateRiskSchema = z.object({
  id: z.string().min(1, {
    message: "Risk ID is required",
  }),
  title: z.string().min(1, {
    message: "Risk title is required",
  }),
  description: z.string().min(1, {
    message: "Risk description is required",
  }),
  category: z.nativeEnum(RiskCategory, {
    required_error: "Risk category is required",
  }),
  department: z.nativeEnum(Departments, {
    required_error: "Risk department is required",
  }),
  ownerId: z.string({
    required_error: "You must assign an owner to the risk",
  }),
  status: z.nativeEnum(RiskStatus, {
    required_error: "Risk status is required",
  }),
});

export const createRiskCommentSchema = z.object({
  riskId: z.string().min(1, {
    message: "Risk ID is required",
  }),
  content: z
    .string()
    .min(1, {
      message: "Comment content is required",
    })
    .max(1000, {
      message: "Comment content should be at most 1000 characters",
    }),
});

export const createTaskSchema = z.object({
  riskId: z.string().min(1, {
    message: "Risk ID is required",
  }),
  title: z.string().min(1, {
    message: "Task title is required",
  }),
  description: z.string().min(1, {
    message: "Task description is required",
  }),
  dueDate: z.date().optional(),
  ownerId: z
    .string({
      required_error: "You must assign an owner to the task",
    })
    .min(1, {
      message: "You must assign an owner to the task",
    }),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, {
    message: "Task ID is required",
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  status: z.nativeEnum(RiskTaskStatus, {
    required_error: "Task status is required",
  }),
  ownerId: z.string({
    required_error: "You must assign an owner to the task",
  }),
});

export const createTaskCommentSchema = z.object({
  riskId: z.string().min(1, {
    message: "Risk ID is required",
  }),
  taskId: z.string().min(1, {
    message: "Task ID is required",
  }),
  content: z
    .string()
    .min(1, {
      message: "Comment content is required",
    })
    .max(1000, {
      message: "Comment content should be at most 1000 characters",
    }),
});

export const uploadTaskFileSchema = z.object({
  riskId: z.string().min(1, {
    message: "Risk ID is required",
  }),
  taskId: z.string().min(1, {
    message: "Task ID is required",
  }),
});

// Integrations
export const deleteIntegrationConnectionSchema = z.object({
  integrationId: z.string().min(1, {
    message: "Integration ID is required",
  }),
});

export const createIntegrationSchema = z.object({
  integrationId: z.string().min(1, {
    message: "Integration ID is required",
  }),
});

// Seed Data
export const seedDataSchema = z.object({
  organizationId: z.string(),
});

export const updateInherentRiskSchema = z.object({
  id: z.string().min(1, {
    message: "Risk ID is required",
  }),
  probability: z.number().min(1).max(10),
  impact: z.number().min(1).max(10),
});

export const updateResidualRiskSchema = z.object({
  id: z.string().min(1, {
    message: "Risk ID is required",
  }),
  probability: z.number().min(1).max(10),
  impact: z.number().min(1).max(10),
});

export const vendorContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

export const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().url("Must be a valid URL"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(VendorCategory),
  ownerId: z.string().optional(),
  contacts: z
    .array(vendorContactSchema)
    .min(1, "At least one contact is required"),
});

export const updateVendorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  website: z.string().url("Must be a valid URL"),
  description: z.string().min(1, "Description is required"),
  category: z.nativeEnum(VendorCategory),
  status: z.nativeEnum(VendorStatus),
  ownerId: z.string().optional(),
  contacts: z
    .array(vendorContactSchema)
    .min(1, "At least one contact is required"),
});

export const createVendorCommentSchema = z.object({
  vendorId: z.string(),
  content: z.string().min(1),
});

export const updateVendorRiskSchema = z.object({
  id: z.string(),
  inherent_risk: z.enum(["low", "medium", "high", "unknown"]).optional(),
  residual_risk: z.enum(["low", "medium", "high", "unknown"]).optional(),
});

// Policies
export const updatePolicySchema = z.object({
  id: z.string(),
  content: z.any(),
});

export const assistantSettingsSchema = z.object({
  enabled: z.boolean().optional(),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  department: z.nativeEnum(Departments, {
    required_error: "Department is required",
  }),
  externalEmployeeId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updatePolicyOverviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});

export const updatePolicyFormSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(PolicyStatus),
  ownerId: z.string(),
  department: z.nativeEnum(Departments),
  review_frequency: z.nativeEnum(Frequency),
  review_date: z.date(),
});

export const apiKeySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(64, { message: "Name must be less than 64 characters" }),
  expiresAt: z.enum(["30days", "90days", "1year", "never"]),
});

export const createPolicyCommentSchema = z.object({
  policyId: z.string().min(1, {
    message: "Policy ID is required",
  }),
  content: z
    .string()
    .min(1, {
      message: "Comment content is required",
    })
    .max(1000, {
      message: "Comment content should be at most 1000 characters",
    }),
});
