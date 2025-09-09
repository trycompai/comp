import type { ApiResponseOptions } from '@nestjs/swagger';

export const CREATE_CONTEXT_RESPONSES: Record<number, ApiResponseOptions> = {
  201: {
    description: 'Context entry created successfully',
    content: {
      'application/json': {
        example: {
          id: 'ctx_abc123def456',
          organizationId: 'org_xyz789uvw012',
          question: 'How do we handle user authentication in our application?',
          answer: 'We use a hybrid authentication system supporting both API keys and session-based authentication.',
          tags: ['authentication', 'security', 'api', 'sessions'],
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T10:30:00.000Z',
          authType: 'apikey',
        },
      },
    },
  },
  400: {
    description: 'Bad request - Invalid input data',
    content: {
      'application/json': {
        example: {
          message: ['question should not be empty', 'answer should not be empty'],
          error: 'Bad Request',
          statusCode: 400,
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
    description: 'Organization not found',
    content: {
      'application/json': {
        example: {
          message: 'Organization not found',
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
