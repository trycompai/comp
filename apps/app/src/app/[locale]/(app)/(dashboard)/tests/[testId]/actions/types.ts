import { z } from "zod";

export interface AppError {
  code: string;
  message: string;
}

export const appErrors = {
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR",
    message: "An unexpected error occurred",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "You are not authorized to perform this action",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Resource not found",
  },
} as const;

export type ActionResponse<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: AppError };
