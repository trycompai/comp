import type { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ALL_CONTEXT_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    description: 'Context entries retrieved successfully',
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: 'ctx_abc123def456',
              organizationId: 'org_xyz789uvw012',
              question: 'How do we handle user authentication in our application?',
              answer: 'We use a hybrid authentication system supporting both API keys and session-based authentication.',
              tags: ['authentication', 'security', 'api', 'sessions'],
              createdAt: '2024-01-15T10:30:00.000Z',
              updatedAt: '2024-01-15T14:20:00.000Z',
            },
            {
              id: 'ctx_ghi789jkl012',
              organizationId: 'org_xyz789uvw012',
              question: 'What database do we use and why?',
              answer: 'We use PostgreSQL as our primary database with Prisma as the ORM.',
              tags: ['database', 'postgresql', 'prisma', 'architecture'],
              createdAt: '2024-01-14T09:15:00.000Z',
              updatedAt: '2024-01-14T09:15:00.000Z',
            },
          ],
          count: 2,
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
