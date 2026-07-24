import type { ApiResponseOptions } from '@nestjs/swagger';

// Shared shape of one acceptance event, reused by the vendor acceptance
// responses (apps/api/src/vendors/schemas/vendor-acceptances.responses.ts).
export const RISK_ACCEPTANCE_SCHEMA = {
  type: 'object' as const,
  properties: {
    id: {
      type: 'string',
      description: 'Acceptance event ID',
      example: 'rska_abc123def456',
    },
    acceptedById: {
      type: 'string',
      nullable: true,
      description: 'Member ID of the acceptor (null if since removed)',
      example: 'mem_abc123def456',
    },
    acceptedByName: {
      type: 'string',
      description: 'Acceptor display name, frozen at acceptance',
      example: 'Jane Doe',
    },
    notes: {
      type: 'string',
      nullable: true,
      example: 'Residual risk reviewed at the Q2 risk review.',
    },
    residualLikelihood: {
      type: 'string',
      enum: ['very_unlikely', 'unlikely', 'possible', 'likely', 'very_likely'],
      description: 'Residual likelihood frozen at acceptance',
      example: 'unlikely',
    },
    residualImpact: {
      type: 'string',
      enum: ['insignificant', 'minor', 'moderate', 'major', 'severe'],
      description: 'Residual impact frozen at acceptance',
      example: 'minor',
    },
    level: {
      type: 'string',
      enum: ['very-low', 'low', 'medium', 'high', 'very-high'],
      description: 'Risk level of the accepted residual rating',
      example: 'low',
    },
    levelLabel: {
      type: 'string',
      description: 'Human-readable level label',
      example: 'Low',
    },
    stale: {
      type: 'boolean',
      description:
        'True when the residual rating changed after this acceptance was recorded — re-acceptance is required',
      example: false,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'When the acceptance was recorded (server-set, immutable)',
    },
  },
};

const NOT_FOUND = (entity: string): ApiResponseOptions => ({
  status: 404,
  description: `${entity} not found`,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: `${entity} with ID abc123 not found in organization org_abc123def456`,
          },
        },
      },
    },
  },
});

const UNAUTHORIZED: ApiResponseOptions = {
  status: 401,
  description: 'Unauthorized - Invalid authentication',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Invalid or expired API key' },
        },
      },
    },
  },
};

const FORBIDDEN: ApiResponseOptions = {
  status: 403,
  description:
    'Forbidden - User does not have permission to access this risk',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'You do not have access to this risk',
          },
        },
      },
    },
  },
};

export const LIST_RISK_ACCEPTANCES_RESPONSES: Record<
  number,
  ApiResponseOptions
> = {
  200: {
    status: 200,
    description: 'Acceptance history retrieved successfully (newest first)',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            data: { type: 'array', items: RISK_ACCEPTANCE_SCHEMA },
          },
        },
      },
    },
  },
  401: UNAUTHORIZED,
  403: FORBIDDEN,
  404: NOT_FOUND('Risk'),
};

export const RECORD_RISK_ACCEPTANCE_RESPONSES: Record<
  number,
  ApiResponseOptions
> = {
  201: {
    status: 201,
    description: 'Acceptance recorded successfully',
    content: { 'application/json': { schema: RISK_ACCEPTANCE_SCHEMA } },
  },
  400: {
    status: 400,
    description: 'No owner assigned, or the acceptor is not a valid member',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example:
                'No owner is assigned. Assign an owner or choose an acceptor.',
            },
          },
        },
      },
    },
  },
  401: UNAUTHORIZED,
  403: FORBIDDEN,
  404: NOT_FOUND('Risk'),
};
