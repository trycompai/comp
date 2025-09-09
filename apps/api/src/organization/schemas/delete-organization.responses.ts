import { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_ORGANIZATION_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Organization deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Indicates successful deletion',
          example: true,
        },
        deletedOrganization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The deleted organization ID',
              example: 'org_abc123def456',
            },
            name: {
              type: 'string',
              description: 'The deleted organization name',
              example: 'Acme Corporation',
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
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Invalid or expired API key',
            'Invalid or expired session',
            'User does not have access to organization',
            'Organization context required',
          ],
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Organization not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Organization with ID org_abc123def456 not found',
        },
      },
    },
  },
};
