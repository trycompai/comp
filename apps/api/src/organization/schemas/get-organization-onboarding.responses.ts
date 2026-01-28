import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ORGANIZATION_ONBOARDING_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Organization onboarding status retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            triggerJobId: {
              type: 'string',
              nullable: true,
              description: 'Trigger.dev onboarding run ID if active',
              example: 'trg_abc123def456',
            },
            authType: {
              type: 'string',
              enum: ['api-key', 'session'],
              description: 'How the request was authenticated',
            },
          },
        },
      },
    },
  },
  401: {
    status: 401,
    description: 'Unauthorized - Invalid authentication or insufficient permissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Invalid or expired API key',
            },
          },
        },
      },
    },
  },
};
