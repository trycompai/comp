import type { ApiParamOptions } from '@nestjs/swagger';

export const RISK_PARAMS: Record<string, ApiParamOptions> = {
  riskId: {
    name: 'id',
    description: 'Risk ID',
    example: 'rsk_abc123def456',
  },
};
