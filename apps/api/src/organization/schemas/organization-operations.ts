import type { ApiOperationOptions } from '@nestjs/swagger';

export const ORGANIZATION_OPERATIONS: Record<string, ApiOperationOptions> = {
  getOrganization: {
    summary: 'Get organization information',
    description:
      'Returns detailed information about the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  updateOrganization: {
    summary: 'Update organization',
    description:
      'Partially updates the authenticated organization. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  deleteOrganization: {
    summary: 'Delete organization',
    description:
      'Permanently deletes the authenticated organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
};
