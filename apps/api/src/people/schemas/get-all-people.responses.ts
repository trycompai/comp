import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ALL_PEOPLE_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'People retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/PeopleResponseDto' },
            },
            count: {
              type: 'number',
              description: 'Total number of people',
              example: 25,
            },
            authType: {
              type: 'string',
              enum: ['api-key', 'session'],
              description: 'How the request was authenticated',
            },
            authenticatedUser: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'User ID',
                  example: 'usr_abc123def456',
                },
                email: {
                  type: 'string',
                  description: 'User email',
                  example: 'user@company.com',
                },
              },
            },
          },
        },
        example: {
          data: [
            {
              id: 'mem_abc123def456',
              organizationId: 'org_abc123def456',
              userId: 'usr_abc123def456',
              role: 'admin',
              createdAt: '2024-01-01T00:00:00Z',
              department: 'it',
              isActive: true,
              fleetDmLabelId: 123,
              user: {
                id: 'usr_abc123def456',
                name: 'John Doe',
                email: 'john.doe@company.com',
                emailVerified: true,
                image: 'https://example.com/avatar.jpg',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-15T00:00:00Z',
                lastLogin: '2024-01-15T12:00:00Z',
              },
            },
          ],
          count: 1,
          authType: 'api-key',
          authenticatedUser: {
            id: 'usr_abc123def456',
            email: 'user@company.com',
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
  500: {
    status: 500,
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Failed to retrieve members',
            },
          },
        },
      },
    },
  },
};
