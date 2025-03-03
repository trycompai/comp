import { z } from "zod";
import type { Role } from "@bubba/db";
import type { CloudProvider, TestRunStatus } from "@prisma/client";

export const testSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  provider: z.string(),
  results: z.string(),
  resultDetails: z.any(),
  label: z.string().nullable(),
  completedAt: z.date(),
  assignedUserId: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  })
});

export type Test = z.infer<typeof testSchema>;

export interface TestsResponse {
  tests: Test[];
  total: number;
}

export interface CloudTest {
  id: string;
  title: string;
  description: string | null;
  provider: string;
  status: string;
  resultDetails: any;
  label: string | null;
  assignedUserId: {
    id: string;
    name: string | null;
    email: string | null;
  };
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
