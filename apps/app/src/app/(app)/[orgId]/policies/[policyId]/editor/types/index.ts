import type { UIMessage } from 'ai';
import { z } from 'zod';
import type { PolicyToolSet } from '../tools/policy-tools';

export type PolicyChatUIMessage = UIMessage<never, never, PolicyToolSet>;

export const policyDetailsSchema = z.object({
  id: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  content: z.array(z.any()),
  createdAt: z.date(),
  updatedAt: z.date(),
  name: z.string(),
  description: z.string().nullable(),
});

export const policyDetailsInputSchema = z.object({
  policyId: z.string(),
  _cache: z.number().optional(),
});

export const updatePolicySchema = z.object({
  policyId: z.string(),
  content: z.any().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export type PolicyDetails = z.infer<typeof policyDetailsSchema>;
export type PolicyDetailsInput = z.infer<typeof policyDetailsInputSchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;

export type AppError = {
  code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'UNEXPECTED_ERROR';
  message: string;
};

export const appErrors = {
  NOT_FOUND: {
    code: 'NOT_FOUND' as const,
    message: 'Policy not found',
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED' as const,
    message: 'You are not authorized to view this policy',
  },
  UNEXPECTED_ERROR: {
    code: 'UNEXPECTED_ERROR' as const,
    message: 'An unexpected error occurred',
  },
} as const;
