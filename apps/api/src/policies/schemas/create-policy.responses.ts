import { ApiResponseOptions } from '@nestjs/swagger';

export const CREATE_POLICY_RESPONSES: Record<string, ApiResponseOptions> = {
  201: {
    status: 201,
    description: 'Policy created successfully',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/PolicyResponseDto' },
        example: {
          id: 'pol_abc123def456',
          name: 'Data Privacy Policy',
          description:
            'This policy outlines how we handle and protect personal data',
          status: 'draft',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Policy content here' }],
            },
          ],
          frequency: 'yearly',
          department: 'it',
          isRequiredToSign: true,
          signedBy: [],
          reviewDate: '2024-12-31T00:00:00.000Z',
          isArchived: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z',
          organizationId: 'org_abc123def456',
          assigneeId: 'usr_abc123def456',
          approverId: 'usr_xyz789abc123',
        },
      },
    },
  },
  400: {
    status: 400,
    description: 'Bad Request - Invalid policy data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Invalid policy content format',
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
            message: { type: 'string', example: 'Unauthorized' },
          },
        },
      },
    },
  },
};
