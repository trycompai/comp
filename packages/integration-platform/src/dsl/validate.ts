import { DynamicIntegrationDefinitionSchema } from './types';
import type { DynamicIntegrationDefinition } from './types';

export interface ValidationResult {
  success: boolean;
  data?: DynamicIntegrationDefinition;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validates a full dynamic integration definition (manifest + checks) against the Zod schema.
 * Returns typed data on success, or structured errors on failure.
 */
export function validateIntegrationDefinition(
  input: unknown,
): ValidationResult {
  const result = DynamicIntegrationDefinitionSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}
