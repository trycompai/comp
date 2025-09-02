import { ApiResponseOptions } from '@nestjs/swagger';

export const BULK_CREATE_MEMBERS_RESPONSES: Record<string, ApiResponseOptions> = {
  201: {
    status: 201,
    description: 'Bulk member creation completed',
    schema: {
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: { $ref: '#/components/schemas/PeopleResponseDto' },
          description: 'Successfully created members',
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'Index in the original array where the error occurred',
                example: 2,
              },
              userId: {
                type: 'string',
                description: 'User ID that failed to be added',
                example: 'usr_abc123def456',
              },
              error: {
                type: 'string',
                description: 'Error message explaining why the member could not be created',
                example: 'User user@example.com is already a member of this organization',
              },
            },
          },
          description: 'Members that failed to be created with error details',
        },
        summary: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of members in the request',
              example: 5,
            },
            successful: {
              type: 'number',
              description: 'Number of members successfully created',
              example: 3,
            },
            failed: {
              type: 'number',
              description: 'Number of members that failed to be created',
              example: 2,
            },
          },
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
  400: {
    status: 400,
    description: 'Bad Request - Invalid bulk data or validation errors',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'Members array cannot be empty',
            'Maximum 100 members allowed per bulk request',
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
  },
};
