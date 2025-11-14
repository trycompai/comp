export const GET_ALL_TASK_TEMPLATES_RESPONSES = {
  200: {
    status: 200,
    description: 'Successfully retrieved all framework editor task templates',
    schema: {
      example: {
        data: [
          {
            id: 'frk_tt_abc123def456',
            name: 'Monthly Security Review',
            description:
              'Review and update security policies on a monthly basis',
            frequency: 'monthly',
            department: 'it',
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        count: 1,
        authType: 'session',
        authenticatedUser: {
          id: 'user_123',
          email: 'user@example.com',
        },
      },
    },
  },
  401: {
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  },
  500: {
    status: 500,
    description: 'Internal server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
      },
    },
  },
};
