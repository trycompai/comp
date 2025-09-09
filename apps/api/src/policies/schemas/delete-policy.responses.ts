import { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_POLICY_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Policy deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Indicates successful deletion',
          example: true,
        },
        deletedPolicy: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The deleted policy ID',
              example: 'pol_abc123def456',
            },
            name: {
              type: 'string',
              description: 'The deleted policy name',
              example: 'Data Privacy Policy',
            },
          },
        },
        authType: {
          type: 'string',
          enum: ['api-key', 'session'],
          description: 'How the request was authenticated',
        },
      },
    },
  },
  401: {
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  },
  404: {
    status: 404,
    description: 'Policy not found',
  },
};
