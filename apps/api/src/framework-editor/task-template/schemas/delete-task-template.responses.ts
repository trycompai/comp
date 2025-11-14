export const DELETE_TASK_TEMPLATE_RESPONSES = {
  200: {
    status: 200,
    description: 'Successfully deleted framework editor task template',
    schema: {
      example: {
        message: 'Framework editor task template deleted successfully',
        deletedTaskTemplate: {
          id: 'frk_tt_abc123def456',
          name: 'Monthly Security Review',
        },
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
