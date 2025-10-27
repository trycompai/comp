import { Departments, TaskFrequency, TaskStatus } from '@db';

// Define possible statuses based on the Prisma schema
export const taskStatuses: TaskStatus[] = Object.values(TaskStatus);

// Define possible frequencies
export const taskFrequencies: TaskFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
];

// Define possible departments
export const taskDepartments: Departments[] = ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'];

// Define MAIN colors for Departments
export const DEPARTMENT_COLORS: Record<Departments, string> = {
  none: '#6b7280', // Gray
  admin: '#14b8a6', // Teal
  gov: '#f97316', // Orange
  hr: '#eab308', // Yellow
  it: '#22c55e', // Green
  itsm: '#3b82f6', // Blue
  qms: '#a855f7', // Purple
};
