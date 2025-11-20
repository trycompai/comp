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
exports.OrganizationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const organization_service_1 = require("./organization.service");
const get_organization_responses_1 = require("./schemas/get-organization.responses");
const update_organization_responses_1 = require("./schemas/update-organization.responses");
const delete_organization_responses_1 = require("./schemas/delete-organization.responses");
const organization_api_bodies_1 = require("./schemas/organization-api-bodies");
const organization_operations_1 = require("./schemas/organization-operations");
let OrganizationController = class OrganizationController {
    organizationService;
    constructor(organizationService) {
        this.organizationService = organizationService;
    }
    async getOrganization(organizationId, authContext, isApiKey) {
        const org = await this.organizationService.findById(organizationId);
        return {
            ...org,
            authType: authContext.authType,
            ...(authContext.userId && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async updateOrganization(organizationId, authContext, updateData) {
        const updatedOrg = await this.organizationService.updateById(organizationId, updateData);
        return {
            ...updatedOrg,
            authType: authContext.authType,
            ...(authContext.userId && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async deleteOrganization(organizationId, authContext) {
        const result = await this.organizationService.deleteById(organizationId);
        return {
            ...result,
            authType: authContext.authType,
            ...(authContext.userId && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
};
exports.OrganizationController = OrganizationController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)(organization_operations_1.ORGANIZATION_OPERATIONS.getOrganization),
    (0, swagger_1.ApiResponse)(get_organization_responses_1.GET_ORGANIZATION_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_organization_responses_1.GET_ORGANIZATION_RESPONSES[401]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, auth_context_decorator_1.IsApiKeyAuth)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Boolean]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "getOrganization", null);
__decorate([
    (0, common_1.Patch)(),
    (0, swagger_1.ApiOperation)(organization_operations_1.ORGANIZATION_OPERATIONS.updateOrganization),
    (0, swagger_1.ApiBody)(organization_api_bodies_1.UPDATE_ORGANIZATION_BODY),
    (0, swagger_1.ApiResponse)(update_organization_responses_1.UPDATE_ORGANIZATION_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_organization_responses_1.UPDATE_ORGANIZATION_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_organization_responses_1.UPDATE_ORGANIZATION_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_organization_responses_1.UPDATE_ORGANIZATION_RESPONSES[404]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "updateOrganization", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)(organization_operations_1.ORGANIZATION_OPERATIONS.deleteOrganization),
    (0, swagger_1.ApiResponse)(delete_organization_responses_1.DELETE_ORGANIZATION_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(delete_organization_responses_1.DELETE_ORGANIZATION_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(delete_organization_responses_1.DELETE_ORGANIZATION_RESPONSES[404]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "deleteOrganization", null);
exports.OrganizationController = OrganizationController = __decorate([
    (0, swagger_1.ApiTags)('Organization'),
    (0, common_1.Controller)({ path: 'organization', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [organization_service_1.OrganizationService])
], OrganizationController);
//# sourceMappingURL=organization.controller.js.map