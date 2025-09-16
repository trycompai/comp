import { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_MEMBER_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Member deleted successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates successful deletion',
              example: true,
            },
            deletedMember: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'The deleted member ID',
                  example: 'mem_abc123def456',
                },
                name: {
                  type: 'string',
                  description: 'The deleted member name',
                  example: 'John Doe',
                },
                email: {
                  type: 'string',
                  description: 'The deleted member email',
                  example: 'john.doe@company.com',
                },
              },
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
            message: { type: 'string', example: 'Failed to delete member' },
          },
        },
      },
    },
  },
};
