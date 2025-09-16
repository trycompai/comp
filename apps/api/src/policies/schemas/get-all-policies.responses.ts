import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_ALL_POLICIES_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Policies retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: { $ref: '#/components/schemas/PolicyResponseDto' },
        },
        example: [
          {
            id: 'pol_abc123def456',
            name: 'Data Privacy Policy',
            status: 'draft',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: '...' }] },
            ],
            isRequiredToSign: true,
            signedBy: [],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-15T00:00:00.000Z',
            organizationId: 'org_abc123def456',
          },
        ],
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
