"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET_POLICY_BY_ID_RESPONSES = void 0;
const swagger_1 = require("@nestjs/swagger");
exports.GET_POLICY_BY_ID_RESPONSES = {
    200: {
        status: 200,
        description: 'Policy retrieved successfully',
        content: {
            'application/json': {
                schema: { $ref: '#/components/schemas/PolicyResponseDto' },
                example: {
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
                        message: { type: 'string', example: 'Unauthorized' },
                    },
                },
            },
        },
    },
    404: {
        status: 404,
        description: 'Policy not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Policy with ID pol_abc123def456 not found',
                        },
                    },
                },
            },
        },
    },
};
//# sourceMappingURL=get-policy-by-id.responses.js.map