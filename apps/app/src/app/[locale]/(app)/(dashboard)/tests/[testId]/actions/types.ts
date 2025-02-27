import { z } from "zod";

// Define the app errors
export const appErrors = {
  NOT_FOUND: { message: "Cloud test not found" },
  UNEXPECTED_ERROR: { message: "An unexpected error occurred" }
};

export type AppError = typeof appErrors[keyof typeof appErrors];

// Define the input schema
export const cloudTestDetailsInputSchema = z.object({
  testId: z.string()
});

export type CloudTestResult = {
  id: string;
  title: string;
  description: string | null;
  provider: string;
  status: string;
  config: any;
  authConfig: any;
  createdAt: Date;
  updatedAt: Date;
  resultDetails: any;
  createdBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  updatedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  runs: Array<{
    id: string;
    status: string;
    result: string | null;
    resultDetails: any | null;
    startedAt: Date | null;
    completedAt: Date | null;
    executedBy: {
      id: string;
      name: string | null;
      email: string | null;
    };
    createdAt: Date;
    updatedAt: Date;
  }>;
};

// Type-safe action response
export type ActionResponse<T> = Promise<
  { success: true; data: T } | { success: false; error: AppError }
>; 