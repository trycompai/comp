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
  transferOwnership: {
    summary: 'Transfer organization ownership',
    description:
      'Transfers organization ownership to another member. The current owner will become an admin and keep all other roles. The new owner will receive the owner role while keeping their existing roles. Only the current organization owner can perform this action. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  getPrimaryColor: {
    summary: 'Get organization primary color',
    description:
      'Returns the primary color of the organization. Supports three access methods: 1) API key authentication (X-API-Key header), 2) Session authentication (cookies + X-Organization-Id header), or 3) Public access using an access token query parameter (?token=tok_xxx). When using an access token, no authentication is required.',
  },
};
