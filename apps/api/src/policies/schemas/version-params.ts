import type { ApiParamOptions } from '@nestjs/swagger';

export const VERSION_PARAMS: Record<string, ApiParamOptions> = {
  policyId: {
    name: 'id',
    description: 'Policy ID',
    required: true,
    schema: { type: 'string', example: 'pol_abc123def456' },
  },
  versionId: {
    name: 'versionId',
    description: 'Policy version ID',
    required: true,
    schema: { type: 'string', example: 'pv_abc123def456' },
  },
};
