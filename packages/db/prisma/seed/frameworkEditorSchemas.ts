import { z } from 'zod';

// Assuming Frequency and Departments enums are defined elsewhere and imported
// For now, we'll use z.string() as a placeholder if their definitions aren't available.
// import { Frequency, Departments } from './path-to-shared-enums'; // Example import

const datePreprocess = (arg: unknown) => {
  if (typeof arg === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(arg)) {
    return arg.replace(' ', 'T') + 'Z';
  }
  return arg;
};

export const FrameworkEditorVideoSchema = z.object({
  id: z.string().optional(), // @id @default
  title: z.string(),
  description: z.string(),
  youtubeId: z.string(),
  url: z.string(),
  createdAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now())
  updatedAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now()) @updatedAt
});

export const FrameworkEditorFrameworkSchema = z.object({
  id: z.string().optional(), // @id @default
  name: z.string(),
  version: z.string(),
  description: z.string(),
  visible: z.boolean().optional(), // @default(true)
  // requirements: FrameworkEditorRequirement[] - relational, omitted
  // frameworkInstances: FrameworkInstance[] - relational, omitted
  createdAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now())
  updatedAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now()) @updatedAt
});

export const FrameworkEditorRequirementSchema = z.object({
  id: z.string().optional(), // @id @default
  frameworkId: z.string(),
  // framework: FrameworkEditorFramework - relational, omitted
  name: z.string(),
  identifier: z.string().optional(), // @default("")
  description: z.string(),
  // controlTemplates: FrameworkEditorControlTemplate[] - relational, omitted
  // requirementMaps: RequirementMap[] - relational, omitted
  createdAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now())
  updatedAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now()) @updatedAt
});

export const FrameworkEditorPolicyTemplateSchema = z.object({
  id: z.string().optional(), // @id @default
  name: z.string(),
  description: z.string(),
  frequency: z.string(), // Placeholder for Frequency enum
  department: z.string(), // Placeholder for Departments enum
  content: z.any(), // Json
  // controlTemplates: FrameworkEditorControlTemplate[] - relational, omitted
  createdAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now())
  updatedAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now()) @updatedAt
  // policies: Policy[] - relational, omitted
});

export const FrameworkEditorTaskTemplateSchema = z.object({
  id: z.string().optional(), // @id @default
  name: z.string(),
  description: z.string(),
  frequency: z.string(), // Placeholder for Frequency enum
  department: z.string(), // Placeholder for Departments enum
  // controlTemplates: FrameworkEditorControlTemplate[] - relational, omitted
  createdAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now())
  updatedAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now()) @updatedAt
  // tasks: Task[] - relational, omitted
});

export const FrameworkEditorControlTemplateSchema = z.object({
  id: z.string().optional(), // @id @default
  name: z.string(),
  description: z.string(),
  // policyTemplates: FrameworkEditorPolicyTemplate[] - relational, omitted
  // requirements: FrameworkEditorRequirement[] - relational, omitted
  // taskTemplates: FrameworkEditorTaskTemplate[] - relational, omitted
  createdAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now())
  updatedAt: z
    .preprocess(
      datePreprocess,
      z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
      }),
    )
    .optional(), // @default(now()) @updatedAt
  // controls: Control[] - relational, omitted
});

// For use in seed script validation
export const frameworkEditorModelSchemas = {
  FrameworkEditorVideo: FrameworkEditorVideoSchema,
  FrameworkEditorFramework: FrameworkEditorFrameworkSchema,
  FrameworkEditorRequirement: FrameworkEditorRequirementSchema,
  FrameworkEditorPolicyTemplate: FrameworkEditorPolicyTemplateSchema,
  FrameworkEditorTaskTemplate: FrameworkEditorTaskTemplateSchema,
  FrameworkEditorControlTemplate: FrameworkEditorControlTemplateSchema,
};
