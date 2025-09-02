import type { ApiParamOptions } from '@nestjs/swagger';

export const POLICY_PARAMS: Record<string, ApiParamOptions> = {
  policyId: {
    name: 'id',
    description: 'Policy ID',
    example: 'pol_abc123def456',
  },
};
