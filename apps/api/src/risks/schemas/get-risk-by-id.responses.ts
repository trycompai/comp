import type { ApiResponseOptions } from '@nestjs/swagger';

export const GET_RISK_BY_ID_RESPONSES: Record<number, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Risk retrieved successfully',
    content: {
      'application/json': {
        schema: {
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
            department: {
              type: 'string',
              enum: ['none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms'],
              nullable: true,
              example: 'it',
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
              enum: ['insignificant', 'minor', 'moderate', 'major', 'severe'],
              example: 'major',
            },
            residualLikelihood: {
              type: 'string',
              enum: [
                'very_unlikely',
                'unlikely',
                'possible',
                'likely',
                'very_likely',
              ],
              example: 'unlikely',
            },
            residualImpact: {
              type: 'string',
              enum: ['insignificant', 'minor', 'moderate', 'major', 'severe'],
              example: 'minor',
            },
            treatmentStrategyDescription: {
              type: 'string',
              nullable: true,
              example:
                'Implement multi-factor authentication and strengthen password requirements',
            },
            treatmentStrategy: {
              type: 'string',
              enum: ['accept', 'avoid', 'mitigate', 'transfer'],
              example: 'mitigate',
            },
            organizationId: {
              type: 'string',
              example: 'org_abc123def456',
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
    description: 'Risk not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example:
                'Risk with ID rsk_abc123def456 not found in organization org_abc123def456',
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
