import type { ApiResponseOptions } from '@nestjs/swagger';

const UNAUTHORIZED_RESPONSE: ApiResponseOptions = {
  status: 401,
  description: 'Unauthorized',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Unauthorized' } },
      },
    },
  },
};

const NOT_FOUND_RESPONSE: ApiResponseOptions = {
  status: 404,
  description: 'Resource not found',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Resource not found' },
        },
      },
    },
  },
};

const BAD_REQUEST_RESPONSE: ApiResponseOptions = {
  status: 400,
  description: 'Invalid request',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Invalid request' },
        },
      },
    },
  },
};

export const GET_POLICY_VERSION_BY_ID_RESPONSES: Record<
  string,
  ApiResponseOptions
> = {
  200: {
    status: 200,
    description: 'Policy version retrieved successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            version: { type: 'object' },
            currentVersionId: { type: 'string', nullable: true },
            pendingVersionId: { type: 'string', nullable: true },
          },
        },
      },
    },
  },
  401: UNAUTHORIZED_RESPONSE,
  404: NOT_FOUND_RESPONSE,
};

export const GET_POLICY_VERSIONS_RESPONSES: Record<string, ApiResponseOptions> =
  {
    200: {
      status: 200,
      description: 'Policy versions retrieved successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              versions: { type: 'array', items: { type: 'object' } },
              currentVersionId: { type: 'string', nullable: true },
              pendingVersionId: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    401: UNAUTHORIZED_RESPONSE,
    404: NOT_FOUND_RESPONSE,
  };

export const CREATE_POLICY_VERSION_RESPONSES: Record<
  string,
  ApiResponseOptions
> = {
  201: {
    status: 201,
    description: 'Policy version created',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            version: { type: 'number' },
          },
        },
      },
    },
  },
  400: BAD_REQUEST_RESPONSE,
  401: UNAUTHORIZED_RESPONSE,
  404: NOT_FOUND_RESPONSE,
};

export const UPDATE_VERSION_CONTENT_RESPONSES: Record<
  string,
  ApiResponseOptions
> = {
  200: {
    status: 200,
    description: 'Version content updated',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { versionId: { type: 'string' } },
        },
      },
    },
  },
  400: BAD_REQUEST_RESPONSE,
  401: UNAUTHORIZED_RESPONSE,
  404: NOT_FOUND_RESPONSE,
};

export const DELETE_VERSION_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Version deleted',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { deletedVersion: { type: 'number' } },
        },
      },
    },
  },
  400: BAD_REQUEST_RESPONSE,
  401: UNAUTHORIZED_RESPONSE,
  404: NOT_FOUND_RESPONSE,
};

export const PUBLISH_VERSION_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Version published',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            version: { type: 'number' },
          },
        },
      },
    },
  },
  400: BAD_REQUEST_RESPONSE,
  401: UNAUTHORIZED_RESPONSE,
  404: NOT_FOUND_RESPONSE,
};

export const SET_ACTIVE_VERSION_RESPONSES: Record<string, ApiResponseOptions> =
  {
    200: {
      status: 200,
      description: 'Active version updated',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              versionId: { type: 'string' },
              version: { type: 'number' },
            },
          },
        },
      },
    },
    400: BAD_REQUEST_RESPONSE,
    401: UNAUTHORIZED_RESPONSE,
    404: NOT_FOUND_RESPONSE,
  };

export const SUBMIT_VERSION_FOR_APPROVAL_RESPONSES: Record<
  string,
  ApiResponseOptions
> = {
  200: {
    status: 200,
    description: 'Version submitted for approval',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            version: { type: 'number' },
          },
        },
      },
    },
  },
  400: BAD_REQUEST_RESPONSE,
  401: UNAUTHORIZED_RESPONSE,
  404: NOT_FOUND_RESPONSE,
};
