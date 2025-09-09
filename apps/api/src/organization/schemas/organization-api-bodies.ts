import type { ApiBodyOptions } from '@nestjs/swagger';

export const UPDATE_ORGANIZATION_BODY: ApiBodyOptions = {
  description: 'Organization update data',
  schema: {
    type: 'object',
    properties: {
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
        description: 'Organization logo URL',
        example: 'https://example.com/logo.png',
      },
      metadata: {
        type: 'string',
        description: 'Additional metadata in JSON format',
        example: '{"theme": "dark", "preferences": {}}',
      },
      website: {
        type: 'string',
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
        description: 'FleetDM label ID for device management',
        example: 123,
      },
      isFleetSetupCompleted: {
        type: 'boolean',
        description: 'Whether FleetDM setup is completed',
        example: false,
      },
    },
    additionalProperties: false,
  },
};
