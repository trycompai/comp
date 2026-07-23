import type { ApiResponseOptions } from '@nestjs/swagger';
import {
  LIST_RISK_ACCEPTANCES_RESPONSES,
  RECORD_RISK_ACCEPTANCE_RESPONSES,
} from '../../risks/schemas/risk-acceptances.responses';

// Vendor risk acceptances share the exact response shape with risk
// acceptances — only the 404 subject differs.

const vendorNotFound: ApiResponseOptions = {
  status: 404,
  description: 'Vendor not found',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example:
              'Vendor with ID vnd_abc123def456 not found in organization org_abc123def456',
          },
        },
      },
    },
  },
};

export const LIST_VENDOR_ACCEPTANCES_RESPONSES: Record<
  number,
  ApiResponseOptions
> = {
  ...LIST_RISK_ACCEPTANCES_RESPONSES,
  404: vendorNotFound,
};

export const RECORD_VENDOR_ACCEPTANCE_RESPONSES: Record<
  number,
  ApiResponseOptions
> = {
  ...RECORD_RISK_ACCEPTANCE_RESPONSES,
  404: vendorNotFound,
};
