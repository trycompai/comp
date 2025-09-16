import type { ApiResponseOptions } from '@nestjs/swagger';

export const UPDATE_CONTEXT_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Context entry updated successfully',
    content: {
      'application/json': {
        example: {
          id: 'ctx_abc123def456',
          organizationId: 'org_xyz789uvw012',
          question: 'How do we handle user authentication in our application?',
          answer:
            'Updated: We use a hybrid authentication system supporting both API keys and session-based authentication with OAuth2 support.',
          tags: ['authentication', 'security', 'api', 'sessions', 'oauth2'],
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T15:45:00.000Z',
          authType: 'apikey',
        },
      },
    },
  },
  400: {
    status: 400,
    description: 'Bad request - Invalid input data',
    content: {
      'application/json': {
        example: {
          message: ['tags must be an array of strings'],
          error: 'Bad Request',
          statusCode: 400,
        },
      },
    },
  },
  401: {
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
    content: {
      'application/json': {
        example: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Context entry not found',
    content: {
      'application/json': {
        example: {
          message:
            'Context entry with ID ctx_abc123def456 not found in organization org_xyz789uvw012',
          statusCode: 404,
        },
      },
    },
  },
  500: {
    status: 500,
    description: 'Internal server error',
    content: {
      'application/json': {
        example: {
          message: 'Internal server error',
          statusCode: 500,
        },
      },
    },
  },
};
