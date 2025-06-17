import { z } from 'zod';

export interface AppError {
  code: string;
  message: string;
}

export const appErrors = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'You are not authorized to access this resource',
  },
  UNEXPECTED_ERROR: {
    code: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred',
  },
};

export interface EmployeesInput {
  search?: string;
  role?: string;
  page?: number;
  per_page?: number;
}

export const employeesInputSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});

export interface EmployeesResponse {
  employees: any[];
  total: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  status: string;
}
