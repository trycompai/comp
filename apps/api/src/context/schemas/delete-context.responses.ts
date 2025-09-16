import type { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_CONTEXT_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Context entry deleted successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            deletedContext: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
              },
            },
            authType: { type: 'string', enum: ['api-key', 'session'] },
          },
        },
        example: {
          message: 'Context entry deleted successfully',
          deletedContext: {
            id: 'ctx_abc123def456',
            question:
              'How do we handle user authentication in our application?',
          },
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
            message: { type: 'string' },
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
