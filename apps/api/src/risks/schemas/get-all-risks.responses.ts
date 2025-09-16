import type { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ALL_RISKS_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Risks retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Risk ID',
                    example: 'rsk_abc123def456',
                  },
                  title: {
                    type: 'string',
                    description: 'Risk title',
                    example:
                      'Data breach vulnerability in user authentication system',
                  },
                  description: {
                    type: 'string',
                    description: 'Risk description',
                    example:
                      'Weak password requirements could lead to unauthorized access to user accounts',
                  },
                  category: {
                    type: 'string',
                    enum: [
                      'customer',
                      'governance',
                      'operations',
                      'other',
                      'people',
                      'regulatory',
                      'reporting',
                      'resilience',
                      'technology',
                      'vendor_management',
                    ],
                    example: 'technology',
                  },
                  status: {
                    type: 'string',
                    enum: ['open', 'pending', 'closed', 'archived'],
                    example: 'open',
                  },
                  likelihood: {
                    type: 'string',
                    enum: [
                      'very_unlikely',
                      'unlikely',
                      'possible',
                      'likely',
                      'very_likely',
                    ],
                    example: 'possible',
                  },
                  impact: {
                    type: 'string',
                    enum: [
                      'insignificant',
                      'minor',
                      'moderate',
                      'major',
                      'severe',
                    ],
                    example: 'major',
                  },
                  treatmentStrategy: {
                    type: 'string',
                    enum: ['accept', 'avoid', 'mitigate', 'transfer'],
                    example: 'mitigate',
                  },
                  assigneeId: {
                    type: 'string',
                    nullable: true,
                    description: 'ID of the user assigned to this risk',
                    example: 'mem_abc123def456',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'When the risk was created',
                  },
                  updatedAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'When the risk was last updated',
                  },
                },
              },
            },
            count: {
              type: 'number',
              description: 'Total number of risks',
              example: 15,
            },
            authType: {
              type: 'string',
              enum: ['api-key', 'session'],
              description: 'How the request was authenticated',
            },
            authenticatedUser: {
              type: 'object',
              description: 'User information (only for session auth)',
              properties: {
                id: { type: 'string', example: 'usr_def456ghi789' },
                email: { type: 'string', example: 'user@example.com' },
              },
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
              example: 'Internal server error',
            },
          },
        },
      },
    },
  },
};
