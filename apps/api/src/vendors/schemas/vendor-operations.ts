import type { ApiOperationOptions } from '@nestjs/swagger';

export const VENDOR_OPERATIONS: Record<string, ApiOperationOptions> = {
  getAllVendors: {
    summary: 'Get all vendors',
    description:
      'Returns all vendors for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  getVendorById: {
    summary: 'Get vendor by ID',
    description:
      'Returns a specific vendor by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  createVendor: {
    summary: 'Create a new vendor',
    description:
      'Creates a new vendor for the authenticated organization. All required fields must be provided. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  updateVendor: {
    summary: 'Update vendor',
    description:
      'Partially updates a vendor. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  deleteVendor: {
    summary: 'Delete vendor',
    description:
      'Permanently removes a vendor from the organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  listVendorAcceptances: {
    summary: 'List vendor risk acceptance events',
    description:
      "Returns the residual-risk acceptance history for a vendor, newest first. Each event freezes the residual rating at acceptance and carries a stale flag set when the vendor's residual rating has changed since (ISO 27001 6.1.3(f)).",
  },
  recordVendorAcceptance: {
    summary: 'Record vendor risk-owner acceptance',
    description:
      "Records an immutable, timestamped acceptance of a vendor's current residual risk by the vendor owner (or a chosen member). Re-record after the residual rating changes; prior events remain in the history.",
  },
};
