import type { ApiParamOptions } from '@nestjs/swagger';

export const CONTEXT_PARAMS: Record<string, ApiParamOptions> = {
  contextId: {
    name: 'id',
    description: 'Context entry ID',
    example: 'ctx_abc123def456',
    required: true,
  },
};
