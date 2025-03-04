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

// Type-safe action response
export type ActionResponse<T> = Promise<
  { success: true; data: T } | { success: false; error: AppError }
>; 