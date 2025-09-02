import type { ApiOperationOptions } from '@nestjs/swagger';

export const POLICY_OPERATIONS: Record<string, ApiOperationOptions> = {
  getAllPolicies: {
    summary: 'Get all policies',
    description:
      'Returns all policies for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  getPolicyById: {
    summary: 'Get policy by ID',
    description:
      'Returns a specific policy by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  createPolicy: {
    summary: 'Create a new policy',
    description:
      'Creates a new policy for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  updatePolicy: {
    summary: 'Update policy',
    description:
      'Partially updates a policy. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  deletePolicy: {
    summary: 'Delete policy',
    description:
      'Permanently deletes a policy. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
};
