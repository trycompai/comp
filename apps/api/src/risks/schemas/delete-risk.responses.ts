import type { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_RISK_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Risk deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Risk deleted successfully',
        },
        deletedRisk: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Deleted risk ID',
              example: 'rsk_abc123def456',
            },
            title: {
              type: 'string',
              description: 'Deleted risk title',
              example: 'Data breach vulnerability in user authentication system',
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
    description: 'Risk not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Risk with ID rsk_abc123def456 not found in organization org_abc123def456',
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
