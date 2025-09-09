import type { ApiParamOptions } from '@nestjs/swagger';

export const VENDOR_PARAMS: Record<string, ApiParamOptions> = {
  vendorId: {
    name: 'id',
    description: 'Vendor ID',
    example: 'vnd_abc123def456',
  },
};
