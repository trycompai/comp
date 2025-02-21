import { z } from "zod";
import type { Role } from "@bubba/db";
import type { CloudProvider, TestRunStatus } from "@prisma/client";

export const testSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  department: z.string().nullable(),
});

export const testsInputSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  page: z.number().default(1),
  per_page: z.number().default(10),
});

export type Test = z.infer<typeof testSchema>;
export type TestsInput = z.infer<typeof testsInputSchema>;

export interface TestsResponse {
  tests: Test[];
  total: number;
}

export interface CloudTest {
  id: string;
  title: string;
  description: string | null;
  provider: CloudProvider;
  status: string;
  lastRun: Date | null;
  lastRunStatus: TestRunStatus | null;
  lastRunResult: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppError {
  code: string;
  message: string;
}

export const appErrors = {
  UNAUTHORIZED: {
    code: "UNAUTHORIZED" as const,
    message: "You are not authorized to view employees",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR" as const,
    message: "An unexpected error occurred",
  },
} as const;
