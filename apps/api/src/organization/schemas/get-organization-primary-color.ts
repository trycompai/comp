import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ORGANIZATION_PRIMARY_COLOR_RESPONSES: Record<
  string,
  ApiResponseOptions
> = {
  200: {
    status: 200,
    description: 'Organization primary color retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            primaryColor: {
              type: 'string',
              nullable: true,
              description: 'The primary color in hex format (e.g., #FF5733)',
              example: '#3B82F6',
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
      'Unauthorized - Invalid authentication or insufficient permissions',
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
  404: {
    status: 404,
    description: 'Organization not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Organization with ID org_abc123def456 not found',
            },
          },
        },
      },
    },
  },
};

