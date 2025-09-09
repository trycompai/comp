import type { ApiOperationOptions } from '@nestjs/swagger';

export const VENDOR_OPERATIONS: Record<string, ApiOperationOptions> = {
  getAllVendors: {
    summary: 'Get all vendors',
    description:
      'Returns all vendors for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  getVendorById: {
    summary: 'Get vendor by ID',
    description:
      'Returns a specific vendor by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  createVendor: {
    summary: 'Create a new vendor',
    description:
      'Creates a new vendor for the authenticated organization. All required fields must be provided. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  updateVendor: {
    summary: 'Update vendor',
    description:
      'Partially updates a vendor. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
  deleteVendor: {
    summary: 'Delete vendor',
    description:
      'Permanently removes a vendor from the organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
  },
};
