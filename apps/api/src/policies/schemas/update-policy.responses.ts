import { ApiResponseOptions } from '@nestjs/swagger';

export const UPDATE_POLICY_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Policy updated successfully',
    type: 'PolicyResponseDto',
  },
  400: {
    status: 400,
    description: 'Bad Request - Invalid update data',
  },
  401: {
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  },
  404: {
    status: 404,
    description: 'Policy not found',
  },
};
