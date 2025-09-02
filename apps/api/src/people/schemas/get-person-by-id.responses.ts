import { ApiResponseOptions } from '@nestjs/swagger';

export const GET_PERSON_BY_ID_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Person retrieved successfully',
    type: 'PeopleResponseDto',
  },
  401: {
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
  },
  404: {
    status: 404,
    description: 'Organization or member not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Organization with ID org_abc123def456 not found',
            'Member with ID mem_abc123def456 not found in organization org_abc123def456',
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
