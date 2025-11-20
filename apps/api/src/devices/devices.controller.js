"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevicesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const devices_by_member_response_dto_1 = require("./dto/devices-by-member-response.dto");
const devices_service_1 = require("./devices.service");
let DevicesController = class DevicesController {
    devicesService;
    constructor(devicesService) {
        this.devicesService = devicesService;
    }
    async getAllDevices(organizationId, authContext) {
        const devices = await this.devicesService.findAllByOrganization(organizationId);
        return {
            data: devices,
            count: devices.length,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async getDevicesByMember(memberId, organizationId, authContext) {
        const [devices, member] = await Promise.all([
            this.devicesService.findAllByMember(organizationId, memberId),
            this.devicesService.getMemberById(organizationId, memberId),
        ]);
        return {
            data: devices,
            count: devices.length,
            member,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
};
exports.DevicesController = DevicesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all devices',
        description: 'Returns all devices for the authenticated organization from FleetDM. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Devices retrieved successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/DeviceResponseDto' },
                        },
                        count: {
                            type: 'number',
                            description: 'Total number of devices',
                            example: 25,
                        },
                        authType: {
                            type: 'string',
                            enum: ['api-key', 'session'],
                            description: 'How the request was authenticated',
                        },
                        authenticatedUser: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'User ID',
                                    example: 'usr_abc123def456',
                                },
                                email: {
                                    type: 'string',
                                    description: 'User email',
                                    example: 'user@company.com',
                                },
                            },
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error - FleetDM integration issue',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Organization does not have FleetDM configured',
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getAllDevices", null);
__decorate([
    (0, common_1.Get)('member/:memberId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get devices by member ID',
        description: "Returns all devices assigned to a specific member within the authenticated organization. Devices are fetched from FleetDM using the member's dedicated fleetDmLabelId. Supports both API key authentication (X-API-Key header) and session authentication (cookies + X-Organization-Id header).",
    }),
    (0, swagger_1.ApiParam)({
        name: 'memberId',
        description: 'Member ID to get devices for',
        example: 'mem_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Member devices retrieved successfully',
        type: devices_by_member_response_dto_1.DevicesByMemberResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Organization or member not found',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Member with ID mem_abc123def456 not found in organization org_abc123def456',
                        },
                    },
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error - FleetDM integration issue',
    }),
    __param(0, (0, common_1.Param)('memberId')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DevicesController.prototype, "getDevicesByMember", null);
exports.DevicesController = DevicesController = __decorate([
    (0, swagger_1.ApiTags)('Devices'),
    (0, common_1.Controller)({ path: 'devices', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [devices_service_1.DevicesService])
], DevicesController);
//# sourceMappingURL=devices.controller.js.map