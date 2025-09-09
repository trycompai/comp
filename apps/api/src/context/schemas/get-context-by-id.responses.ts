import type { ApiResponseOptions } from '@nestjs/swagger';

export const GET_CONTEXT_BY_ID_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    description: 'Context entry retrieved successfully',
    content: {
      'application/json': {
        example: {
          id: 'ctx_abc123def456',
          organizationId: 'org_xyz789uvw012',
          question: 'How do we handle user authentication in our application?',
          answer: 'We use a hybrid authentication system supporting both API keys and session-based authentication.',
          tags: ['authentication', 'security', 'api', 'sessions'],
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T14:20:00.000Z',
          authType: 'apikey',
        },
      },
    },
  },
  401: {
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
    description: 'Context entry not found',
    content: {
      'application/json': {
        example: {
          message: 'Context entry with ID ctx_abc123def456 not found in organization org_xyz789uvw012',
          statusCode: 404,
        },
      },
    },
  },
  500: {
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
