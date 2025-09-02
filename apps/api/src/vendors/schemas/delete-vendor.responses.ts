import type { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_VENDOR_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Vendor deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Vendor deleted successfully',
        },
        deletedVendor: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Deleted vendor ID',
              example: 'vnd_abc123def456',
            },
            name: {
              type: 'string',
              description: 'Deleted vendor name',
              example: 'CloudTech Solutions Inc.',
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
          description: 'User information (only for session auth)',
          properties: {
            id: { type: 'string', example: 'usr_def456ghi789' },
            email: { type: 'string', example: 'user@example.com' },
          },
        },
      },
    },
  },
  401: {
    status: 401,
    description: 'Unauthorized - Invalid authentication or insufficient permissions',
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
    description: 'Vendor not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Vendor with ID vnd_abc123def456 not found in organization org_abc123def456',
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
          example: 'Internal server error',
        },
      },
    },
  },
};
