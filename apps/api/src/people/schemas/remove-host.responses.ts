import { ApiResponseOptions } from '@nestjs/swagger';

export const REMOVE_HOST_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Host removed from Fleet successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates successful removal',
              example: true,
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
    description:
      'Unauthorized - Invalid authentication, insufficient permissions, or not organization owner',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Organization or member not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example:
                'Member with ID mem_abc123def456 not found in organization org_abc123def456',
            },
          },
        },
      },
    },
  },
  500: {
    status: 500,
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Failed to remove host' },
          },
        },
      },
    },
  },
};
