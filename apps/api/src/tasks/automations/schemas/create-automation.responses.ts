export const CREATE_AUTOMATION_RESPONSES = {
  201: {
    status: 201,
    description: 'Automation created successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            automation: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'auto_abc123def456' },
                name: {
                  type: 'string',
                  example: 'Task Name - Evidence Collection',
                },
              },
            },
          },
        },
      },
    },
  },
  400: {
    status: 400,
    description: 'Bad request - Invalid task ID or organization ID',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Invalid task ID or organization ID',
            },
          },
        },
      },
    },
  },
  401: {
    status: 401,
    description: 'Unauthorized - Invalid authentication',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Task not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Task not found' },
          },
        },
      },
    },
  },
};
