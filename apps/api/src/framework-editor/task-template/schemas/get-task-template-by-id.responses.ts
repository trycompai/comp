export const GET_TASK_TEMPLATE_BY_ID_RESPONSES = {
  200: {
    status: 200,
    description: 'Successfully retrieved framework editor task template',
    schema: {
      example: {
        id: 'frk_tt_abc123def456',
        name: 'Monthly Security Review',
        description: 'Review and update security policies on a monthly basis',
        frequency: 'monthly',
        department: 'it',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
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
  404: {
    status: 404,
    description: 'Framework editor task template not found',
    schema: {
      example: {
        statusCode: 404,
        message:
          'Framework editor task template with ID frk_tt_abc123def456 not found',
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
