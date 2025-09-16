import { ApiResponseOptions } from '@nestjs/swagger';

export const DELETE_ORGANIZATION_RESPONSES: Record<string, ApiResponseOptions> =
  {
    200: {
      status: 200,
      description: 'Organization deleted successfully',
      content: {
        'application/json': {
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
      },
    },
    401: {
      status: 401,
      description:
        'Unauthorized - Invalid authentication or insufficient permissions',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Invalid or expired API key',
              },
            },
          },
        },
      },
    },
    404: {
      status: 404,
      description: 'Organization not found',
      content: {
        'application/json': {
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
      },
    },
  };
