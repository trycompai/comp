import { z } from "zod";

export const cloudProviderSchema = z.enum(["AWS", "AZURE", "GCP"]);
export const testRunStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"]);

export const cloudTestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  provider: cloudProviderSchema,
  status: z.string().default("draft"),
  config: z.record(z.any()),
  authConfig: z.record(z.any()),
  organizationId: z.string(),
  createdById: z.string(),
  updatedById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const cloudTestRunSchema = z.object({
  id: z.string(),
  status: testRunStatusSchema,
  result: z.string().nullable(), // PASS, FAIL, ERROR
  resultDetails: z.record(z.any()).nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  cloudTestId: z.string(),
  executedById: z.string(),
  organizationId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CloudProvider = z.infer<typeof cloudProviderSchema>;
export type TestRunStatus = z.infer<typeof testRunStatusSchema>;
export type CloudTest = z.infer<typeof cloudTestSchema>;
export type CloudTestRun = z.infer<typeof cloudTestRunSchema>;

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
