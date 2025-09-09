import type { ApiBodyOptions } from '@nestjs/swagger';
import { CreatePolicyDto } from '../dto/create-policy.dto';
import { UpdatePolicyDto } from '../dto/update-policy.dto';

export const POLICY_BODIES: Record<string, ApiBodyOptions> = {
  createPolicy: {
    description: 'Policy creation data',
    type: CreatePolicyDto,
  },
  updatePolicy: {
    description: 'Policy update data',
    type: UpdatePolicyDto,
  },
};
