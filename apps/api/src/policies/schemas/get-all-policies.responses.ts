import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ALL_POLICIES_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Policies retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/PolicyResponseDto' },
              description: 'Array of policies',
            },
            authType: {
              type: 'string',
              enum: ['api-key', 'session'],
              description: 'How the request was authenticated',
            },
            authenticatedUser: {
              type: 'object',
              description: 'Authenticated user information (only present for session auth)',
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
          required: ['data', 'authType'],
        },
        example: {
          data: [
            {
              id: 'pol_abc123def456',
              name: 'Data Privacy Policy',
              description: 'This policy outlines how we handle and protect personal data',
              status: 'draft',
              content: [
                {
                  type: 'paragraph',
                  attrs: { textAlign: null },
                  content: [
                    {
                      type: 'text',
                      text: 'This policy outlines our commitment to protecting personal data.',
                    },
                  ],
                },
              ],
              frequency: 'yearly',
              department: 'IT',
              isRequiredToSign: true,
              signedBy: [],
              reviewDate: '2024-12-31T00:00:00.000Z',
              isArchived: false,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-15T00:00:00.000Z',
              lastArchivedAt: null,
              lastPublishedAt: '2024-01-10T00:00:00.000Z',
              organizationId: 'org_abc123def456',
              assigneeId: 'usr_abc123def456',
              approverId: 'usr_xyz789abc123',
              policyTemplateId: null,
            },
          ],
          authType: 'session',
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
          properties: { message: { type: 'string', example: 'Unauthorized' } },
        },
      },
    },
  },
};
