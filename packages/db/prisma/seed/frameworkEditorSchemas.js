"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameworkEditorModelSchemas = exports.FrameworkEditorControlTemplateSchema = exports.FrameworkEditorTaskTemplateSchema = exports.FrameworkEditorPolicyTemplateSchema = exports.FrameworkEditorRequirementSchema = exports.FrameworkEditorFrameworkSchema = exports.FrameworkEditorVideoSchema = void 0;
const zod_1 = require("zod");
// Assuming Frequency and Departments enums are defined elsewhere and imported
// For now, we'll use z.string() as a placeholder if their definitions aren't available.
// import { Frequency, Departments } from './path-to-shared-enums'; // Example import
const datePreprocess = (arg) => {
    if (typeof arg === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(arg)) {
        return arg.replace(' ', 'T') + 'Z';
    }
    return arg;
};
exports.FrameworkEditorVideoSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // @id @default
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    youtubeId: zod_1.z.string(),
    url: zod_1.z.string(),
    createdAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now())
    updatedAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now()) @updatedAt
});
exports.FrameworkEditorFrameworkSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // @id @default
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    description: zod_1.z.string(),
    visible: zod_1.z.boolean().optional(), // @default(true)
    // requirements: FrameworkEditorRequirement[] - relational, omitted
    // frameworkInstances: FrameworkInstance[] - relational, omitted
    createdAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now())
    updatedAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now()) @updatedAt
});
exports.FrameworkEditorRequirementSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // @id @default
    frameworkId: zod_1.z.string(),
    // framework: FrameworkEditorFramework - relational, omitted
    name: zod_1.z.string(),
    identifier: zod_1.z.string().optional(), // @default("")
    description: zod_1.z.string(),
    // controlTemplates: FrameworkEditorControlTemplate[] - relational, omitted
    // requirementMaps: RequirementMap[] - relational, omitted
    createdAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now())
    updatedAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now()) @updatedAt
});
exports.FrameworkEditorPolicyTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // @id @default
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    frequency: zod_1.z.string(), // Placeholder for Frequency enum
    department: zod_1.z.string(), // Placeholder for Departments enum
    content: zod_1.z.any(), // Json
    // controlTemplates: FrameworkEditorControlTemplate[] - relational, omitted
    createdAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now())
    updatedAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now()) @updatedAt
    // policies: Policy[] - relational, omitted
});
exports.FrameworkEditorTaskTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // @id @default
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    frequency: zod_1.z.string(), // Placeholder for Frequency enum
    department: zod_1.z.string(), // Placeholder for Departments enum
    // controlTemplates: FrameworkEditorControlTemplate[] - relational, omitted
    createdAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now())
    updatedAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now()) @updatedAt
    // tasks: Task[] - relational, omitted
});
exports.FrameworkEditorControlTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // @id @default
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    // policyTemplates: FrameworkEditorPolicyTemplate[] - relational, omitted
    // requirements: FrameworkEditorRequirement[] - relational, omitted
    // taskTemplates: FrameworkEditorTaskTemplate[] - relational, omitted
    createdAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for createdAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now())
    updatedAt: zod_1.z
        .preprocess(datePreprocess, zod_1.z.string().datetime({
        message: 'Invalid datetime string for updatedAt. Expected ISO 8601 format.',
    }))
        .optional(), // @default(now()) @updatedAt
    // controls: Control[] - relational, omitted
});
// For use in seed script validation
exports.frameworkEditorModelSchemas = {
    FrameworkEditorVideo: exports.FrameworkEditorVideoSchema,
    FrameworkEditorFramework: exports.FrameworkEditorFrameworkSchema,
    FrameworkEditorRequirement: exports.FrameworkEditorRequirementSchema,
    FrameworkEditorPolicyTemplate: exports.FrameworkEditorPolicyTemplateSchema,
    FrameworkEditorTaskTemplate: exports.FrameworkEditorTaskTemplateSchema,
    FrameworkEditorControlTemplate: exports.FrameworkEditorControlTemplateSchema,
};
