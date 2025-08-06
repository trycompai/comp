import { TaskStatus, VendorCategory, VendorStatus } from '@db';
import { z } from 'zod';

// Get validation schemas with internationalized error messages
export const getCreateVendorTaskCommentSchema = (t: (content: string) => string) =>
  z.object({
    vendorId: z.string().min(1, {
      message: t('Vendor ID is required'),
    }),
    vendorTaskId: z.string().min(1, {
      message: t('Task ID is required'),
    }),
    content: z.string().min(1, {
      message: t('Task content is required'),
    }),
  });

export const getCreateVendorTaskSchema = (t: (content: string) => string) =>
  z.object({
    vendorId: z.string().min(1, {
      message: t('Vendor ID is required'),
    }),
    title: z.string().min(1, {
      message: t('Title is required'),
    }),
    description: z.string().min(1, {
      message: t('Description is required'),
    }),
    dueDate: z.date({
      required_error: t('Due date is required'),
    }),
    assigneeId: z.string().nullable(),
  });

export const getVendorContactSchema = (t: (content: string) => string) =>
  z.object({
    name: z.string().min(1, t('Name is required')),
    email: z.string().email(t('Invalid email address')),
    role: z.string().min(1, t('Role is required')),
  });

export const getCreateVendorSchema = (t: (content: string) => string) =>
  z.object({
    name: z.string().min(1, t('Name is required')),
    website: z.string().url(t('Must be a valid URL')),
    description: z.string().min(1, t('Description is required')),
    category: z.nativeEnum(VendorCategory),
    assigneeId: z.string().nullable(),
    contacts: z.array(getVendorContactSchema(t)).min(1, t('At least one contact is required')),
  });

export const getUpdateVendorSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string(),
    name: z.string().min(1, t('Name is required')),
    description: z.string().min(1, t('Description is required')),
    category: z.nativeEnum(VendorCategory),
    status: z.nativeEnum(VendorStatus),
    assigneeId: z.string().nullable(),
  });

export const getCreateVendorCommentSchema = (t: (content: string) => string) =>
  z.object({
    vendorId: z.string(),
    content: z.string().min(1),
  });

export const getUpdateVendorRiskSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string(),
    inherent_risk: z.enum(['low', 'medium', 'high', 'unknown']).optional(),
    residual_risk: z.enum(['low', 'medium', 'high', 'unknown']).optional(),
  });

export const getUpdateVendorTaskSchema = (t: (content: string) => string) =>
  z.object({
    id: z.string().min(1, {
      message: t('Task ID is required'),
    }),
    vendorId: z.string().min(1, {
      message: t('Vendor ID is required'),
    }),
    title: z.string().min(1, {
      message: t('Title is required'),
    }),
    description: z.string().min(1, {
      message: t('Description is required'),
    }),
    dueDate: z.date().optional(),
    status: z.nativeEnum(TaskStatus, {
      required_error: t('Task status is required'),
    }),
    assigneeId: z.string().nullable(),
  });
