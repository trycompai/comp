import type { ApiParamOptions } from '@nestjs/swagger';

export const PEOPLE_PARAMS: Record<string, ApiParamOptions> = {
  memberId: {
    name: 'id',
    description: 'Member ID',
    example: 'mem_abc123def456',
  },
};
