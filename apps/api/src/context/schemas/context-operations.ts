import type { ApiOperationOptions } from '@nestjs/swagger';

export const CONTEXT_OPERATIONS: Record<string, ApiOperationOptions> = {
  getAllContext: {
    summary: 'Get all context entries',
    description:
      'Returns all context entries for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  getContextById: {
    summary: 'Get context entry by ID',
    description:
      'Returns a specific context entry by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  createContext: {
    summary: 'Create a new context entry',
    description:
      'Creates a new context entry for the authenticated organization. All required fields must be provided. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  updateContext: {
    summary: 'Update context entry',
    description:
      'Partially updates a context entry. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  deleteContext: {
    summary: 'Delete context entry',
    description:
      'Permanently removes a context entry from the organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
};
