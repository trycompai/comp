import type { ApiResponseOptions } from '@nestjs/swagger';
import { PolicyAcknowledgmentsResponseDto } from '../dto/policy-acknowledgment.dto';

export const GET_POLICY_ACKNOWLEDGMENTS_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Acknowledgments for the policy (across all versions)',
    type: PolicyAcknowledgmentsResponseDto,
  },
  401: { status: 401, description: 'Unauthorized' },
  404: { status: 404, description: 'Policy not found' },
};
