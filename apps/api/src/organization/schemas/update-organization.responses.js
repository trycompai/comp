"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPDATE_ORGANIZATION_RESPONSES = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.UPDATE_ORGANIZATION_RESPONSES = {
    200: {
        status: 200,
        description: 'Organization updated successfully',
        content: {
            'application/json': {
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
        },
    },
    400: {
        status: 400,
        description: 'Bad Request - Invalid update data',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Invalid slug format',
                        },
                    },
                },
            },
        },
    },
    401: {
        status: 401,
        description: 'Unauthorized - Invalid authentication or insufficient permissions',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Invalid or expired API key',
                        },
                    },
                },
            },
        },
    },
    404: {
        status: 404,
        description: 'Organization not found',
        content: {
            'application/json': {
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
        },
    },
};
//# sourceMappingURL=update-organization.responses.js.map