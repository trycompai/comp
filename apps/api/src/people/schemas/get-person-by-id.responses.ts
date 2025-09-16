import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_PERSON_BY_ID_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Person retrieved successfully',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/PeopleResponseDto' },
        example: {
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
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Organization or member not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example:
                'Member with ID mem_abc123def456 not found in organization org_abc123def456',
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
            message: { type: 'string', example: 'Internal server error' },
          },
        },
      },
    },
  },
};
