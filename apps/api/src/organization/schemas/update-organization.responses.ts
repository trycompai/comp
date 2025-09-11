import { ApiResponseOptions } from '@nestjs/swagger';

export const UPDATE_ORGANIZATION_RESPONSES: Record<string, ApiResponseOptions> = {
  200: {
    status: 200,
    description: 'Organization updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The organization ID',
          example: 'org_abc123def456',
        },
        name: {
          type: 'string',
          description: 'Organization name',
          example: 'New Acme Corporation',
        },
        slug: {
          type: 'string',
          description: 'Organization slug',
          example: 'new-acme-corp',
        },
        logo: {
          type: 'string',
          nullable: true,
          description: 'Organization logo URL',
          example: 'https://example.com/logo.png',
        },
        metadata: {
          type: 'string',
          nullable: true,
          description: 'Additional metadata in JSON format',
          example: '{"theme": "dark", "preferences": {}}',
        },
        website: {
          type: 'string',
          nullable: true,
          description: 'Organization website URL',
          example: 'https://acme-corp.com',
        },
        onboardingCompleted: {
          type: 'boolean',
          description: 'Whether onboarding is completed',
          example: true,
        },
        hasAccess: {
          type: 'boolean',
          description: 'Whether organization has access to the platform',
          example: true,
        },
        fleetDmLabelId: {
          type: 'integer',
          nullable: true,
          description: 'FleetDM label ID for device management',
          example: 123,
        },
        isFleetSetupCompleted: {
          type: 'boolean',
          description: 'Whether FleetDM setup is completed',
          example: false,
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'When the organization was created',
        },
        authType: {
          type: 'string',
          enum: ['api-key', 'session'],
          description: 'How the request was authenticated',
        },
      },
    },
  },
  400: {
    status: 400,
    description: 'Bad Request - Invalid update data',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Validation failed',
            'Invalid slug format',
            'Organization name already exists',
          ],
        },
      },
    },
  },
  401: {
    status: 401,
    description:
      'Unauthorized - Invalid authentication or insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          examples: [
            'Invalid or expired API key',
            'Invalid or expired session',
            'User does not have access to organization',
            'Organization context required',
          ],
        },
      },
    },
  },
  404: {
    status: 404,
    description: 'Organization not found',
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
};
