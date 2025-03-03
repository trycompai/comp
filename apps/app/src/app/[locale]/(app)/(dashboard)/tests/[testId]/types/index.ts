import { z } from "zod";

export const cloudProviderSchema = z.enum(["aws", "azure", "gcp"]);

export const cloudTestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  provider: cloudProviderSchema,
  status: z.string().default("draft"),
  resultDetails: z.record(z.any()),
  label: z.string(),
  assignedUserId: z.string(),
  updatedById: z.string(),
  completedAt: z.date(),
});


export type CloudProvider = z.infer<typeof cloudProviderSchema>;
export type CloudTest = z.infer<typeof cloudTestSchema>;

export type AppError = {
  code: "NOT_FOUND" | "UNAUTHORIZED" | "UNEXPECTED_ERROR";
  message: string;
};

export const appErrors = {
  NOT_FOUND: {
    code: "NOT_FOUND" as const,
    message: "Test not found",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED" as const,
    message: "You are not authorized to view this test",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR" as const,
    message: "An unexpected error occurred",
  },
} as const;
