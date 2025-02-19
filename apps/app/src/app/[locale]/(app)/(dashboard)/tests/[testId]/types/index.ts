import { z } from "zod";

export const employeeTaskSchema = z.object({
  id: z.string(),
  status: z.enum(["assigned", "in_progress", "completed", "overdue"]),
  requiredTask: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
});

export const employeeDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  createdAt: z.date(),
  isActive: z.boolean(),
  employeeTasks: z.array(employeeTaskSchema),
});

export const employeeDetailsInputSchema = z.object({
  employeeId: z.string(),
});

export type EmployeeTask = z.infer<typeof employeeTaskSchema>;
export type EmployeeDetails = z.infer<typeof employeeDetailsSchema>;
export type EmployeeDetailsInput = z.infer<typeof employeeDetailsInputSchema>;

export type AppError = {
  code: "NOT_FOUND" | "UNAUTHORIZED" | "UNEXPECTED_ERROR";
  message: string;
};

export const appErrors = {
  NOT_FOUND: {
    code: "NOT_FOUND" as const,
    message: "Employee not found",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED" as const,
    message: "You are not authorized to view this employee",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR" as const,
    message: "An unexpected error occurred",
  },
} as const;
