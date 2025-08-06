import { z } from 'zod';

export interface AppError {
  code: string;
  message: string;
}

export const getAppErrors = (t: (content: string) => string) => ({
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: t('You are not authorized to access this resource'),
  },
  UNEXPECTED_ERROR: {
    code: 'UNEXPECTED_ERROR',
    message: t('An unexpected error occurred'),
  },
});

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
