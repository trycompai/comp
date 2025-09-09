import { ApiResponseOptions } from '@nestjs/swagger';

export const CREATE_POLICY_RESPONSES: Record<string, ApiResponseOptions> = {
  201: {
    status: 201,
    description: 'Policy created successfully',
    type: 'PolicyResponseDto',
  },
  400: {
    status: 400,
    description: 'Bad Request - Invalid policy data',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'Invalid policy content format',
            'Policy name already exists',
          ],
        },
      },
    },
  },
  401: {
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  },
};
