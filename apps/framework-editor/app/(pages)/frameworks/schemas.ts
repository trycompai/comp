import { z } from "zod";

export const FrameworkBaseSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  version: z.string().min(1, { message: "Version is required." }),
  visible: z.boolean().default(true),
});

export const RequirementBaseSchema = z.object({
  name: z.string().min(1, { message: "Requirement name is required." }),
  description: z.string().optional(), // Assuming description can be optional
  identifier: z.string().optional(), // Identifier is optional
});
