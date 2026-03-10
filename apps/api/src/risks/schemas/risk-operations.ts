import type { ApiOperationOptions } from '@nestjs/swagger';

export const RISK_OPERATIONS: Record<string, ApiOperationOptions> = {
  getAllRisks: {
    summary: 'Get all risks',
    description:
      'Returns all risks for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  getRiskById: {
    summary: 'Get risk by ID',
    description:
      'Returns a specific risk by ID for the authenticated organization. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  createRisk: {
    summary: 'Create a new risk',
    description:
      'Creates a new risk for the authenticated organization. All required fields must be provided. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  updateRisk: {
    summary: 'Update risk',
    description:
      'Partially updates a risk. Only provided fields will be updated. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
  deleteRisk: {
    summary: 'Delete risk',
    description:
      'Permanently removes a risk from the organization. This action cannot be undone. Supports both API key authentication (X-API-Key header) and session authentication (Bearer token or cookies).',
  },
};
