import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_POLICY_BY_ID_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Policy retrieved successfully',
    type: 'PolicyResponseDto',
  },
  401: {
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  },
  404: {
    status: 404,
    description: 'Policy not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Policy with ID pol_abc123def456 not found',
        },
      },
    },
  },
};
