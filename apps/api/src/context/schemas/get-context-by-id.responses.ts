import type { ApiResponseOptions } from '@nestjs/swagger';

export const GET_CONTEXT_BY_ID_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Context entry retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ctx_abc123def456' },
            organizationId: { type: 'string', example: 'org_xyz789uvw012' },
            question: { type: 'string' },
            answer: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['authentication', 'security'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            authType: { type: 'string', enum: ['api-key', 'session'] },
          },
        },
        example: {
          id: 'ctx_abc123def456',
          organizationId: 'org_xyz789uvw012',
          question: 'How do we handle user authentication in our application?',
          answer:
            'We use a hybrid authentication system supporting both API keys and session-based authentication.',
          tags: ['authentication', 'security', 'api', 'sessions'],
          createdAt: '2024-01-15T10:30:00.000Z',
          updatedAt: '2024-01-15T14:20:00.000Z',
          authType: 'apikey',
        },
      },
    },
  },
  401: {
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
            statusCode: { type: 'number', example: 401 },
          },
        },
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
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            statusCode: { type: 'number', example: 404 },
          },
        },
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
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            statusCode: { type: 'number', example: 500 },
          },
        },
        example: {
          message: 'Internal server error',
          statusCode: 500,
        },
      },
    },
  },
};
