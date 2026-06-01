import type { ApiOperationOptions } from '@nestjs/swagger';

export const POLICY_OPERATIONS: Record<string, ApiOperationOptions> = {
  getAllPolicies: {
    summary: 'Get all policies',
    description:
      'Lists active policies by default. Pass includeArchived=true to include archived rows and excludeContent=true to skip heavy content fields. Fetch one policy by ID for full content.',
  },
  getPolicyById: {
    summary: 'Get policy by ID',
    description:
      'Returns a specific policy by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  createPolicy: {
    summary: 'Create a new policy',
    description:
      'Creates a new policy for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  updatePolicy: {
    summary: 'Update policy',
    description:
      'Partially updates a policy. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  deletePolicy: {
    summary: 'Delete policy',
    description:
      'Permanently deletes a policy. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
};
