import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ALL_PEOPLE_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'People retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PeopleResponseDto' },
        },
        count: {
          type: 'number',
          description: 'Total number of people',
          example: 25,
        },
        authType: {
          type: 'string',
          enum: ['api-key', 'session'],
          description: 'How the request was authenticated',
        },
        authenticatedUser: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: 'usr_abc123def456',
            },
            email: {
              type: 'string',
              description: 'User email',
              example: 'user@company.com',
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
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Invalid or expired API key',
            'Invalid or expired session',
            'User does not have access to organization',
            'Organization context required',
          ],
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Organization not found',
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
  500: {
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Failed to retrieve members',
        },
      },
    },
  },
};
