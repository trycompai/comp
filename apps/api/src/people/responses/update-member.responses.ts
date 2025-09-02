import { ApiResponseOptions } from '@nestjs/swagger';

export const UPDATE_MEMBER_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Member updated successfully',
    type: 'PeopleResponseDto',
  },
  400: {
    status: 400,
    description: 'Bad Request - Invalid update data or user conflict',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'User user@example.com is already a member of this organization',
            'Invalid user ID or role',
          ],
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
    description: 'Organization, member, or user not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
            'Member with ID mem_abc123def456 not found in organization org_abc123def456',
            'User with ID usr_abc123def456 not found',
          ],
        },
      },
    },
  },
  500: {
    status: 500,
    description: 'Internal server error',
  },
};
