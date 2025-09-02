import { ApiResponseOptions } from '@nestjs/swagger';

export const CREATE_MEMBER_RESPONSES: Record<string, ApiResponseOptions> = {
  201: {
    status: 201,
    description: 'Member created successfully',
    type: 'PeopleResponseDto',
  },
  400: {
    status: 400,
    description: 'Bad Request - Invalid member data or user already exists',
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
    description: 'Organization or user not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
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
