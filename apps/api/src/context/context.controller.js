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
exports.ContextController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const create_context_dto_1 = require("./dto/create-context.dto");
const update_context_dto_1 = require("./dto/update-context.dto");
const context_service_1 = require("./context.service");
const context_operations_1 = require("./schemas/context-operations");
const context_params_1 = require("./schemas/context-params");
const context_bodies_1 = require("./schemas/context-bodies");
const get_all_context_responses_1 = require("./schemas/get-all-context.responses");
const get_context_by_id_responses_1 = require("./schemas/get-context-by-id.responses");
const create_context_responses_1 = require("./schemas/create-context.responses");
const update_context_responses_1 = require("./schemas/update-context.responses");
const delete_context_responses_1 = require("./schemas/delete-context.responses");
let ContextController = class ContextController {
    contextService;
    constructor(contextService) {
        this.contextService = contextService;
    }
    async getAllContext(organizationId, authContext) {
        const contextEntries = await this.contextService.findAllByOrganization(organizationId);
        return {
            data: contextEntries,
            count: contextEntries.length,
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
    async getContextById(contextId, organizationId, authContext) {
        const contextEntry = await this.contextService.findById(contextId, organizationId);
        return {
            ...contextEntry,
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
    async createContext(createContextDto, organizationId, authContext) {
        const contextEntry = await this.contextService.create(organizationId, createContextDto);
        return {
            ...contextEntry,
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
    async updateContext(contextId, updateContextDto, organizationId, authContext) {
        const updatedContextEntry = await this.contextService.updateById(contextId, organizationId, updateContextDto);
        return {
            ...updatedContextEntry,
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
    async deleteContext(contextId, organizationId, authContext) {
        const result = await this.contextService.deleteById(contextId, organizationId);
        return {
            ...result,
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
exports.ContextController = ContextController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)(context_operations_1.CONTEXT_OPERATIONS.getAllContext),
    (0, swagger_1.ApiResponse)(get_all_context_responses_1.GET_ALL_CONTEXT_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_all_context_responses_1.GET_ALL_CONTEXT_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_all_context_responses_1.GET_ALL_CONTEXT_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_all_context_responses_1.GET_ALL_CONTEXT_RESPONSES[500]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ContextController.prototype, "getAllContext", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)(context_operations_1.CONTEXT_OPERATIONS.getContextById),
    (0, swagger_1.ApiParam)(context_params_1.CONTEXT_PARAMS.contextId),
    (0, swagger_1.ApiResponse)(get_context_by_id_responses_1.GET_CONTEXT_BY_ID_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_context_by_id_responses_1.GET_CONTEXT_BY_ID_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_context_by_id_responses_1.GET_CONTEXT_BY_ID_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_context_by_id_responses_1.GET_CONTEXT_BY_ID_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ContextController.prototype, "getContextById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)(context_operations_1.CONTEXT_OPERATIONS.createContext),
    (0, swagger_1.ApiBody)(context_bodies_1.CONTEXT_BODIES.createContext),
    (0, swagger_1.ApiResponse)(create_context_responses_1.CREATE_CONTEXT_RESPONSES[201]),
    (0, swagger_1.ApiResponse)(create_context_responses_1.CREATE_CONTEXT_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(create_context_responses_1.CREATE_CONTEXT_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(create_context_responses_1.CREATE_CONTEXT_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(create_context_responses_1.CREATE_CONTEXT_RESPONSES[500]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_context_dto_1.CreateContextDto, String, Object]),
    __metadata("design:returntype", Promise)
], ContextController.prototype, "createContext", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)(context_operations_1.CONTEXT_OPERATIONS.updateContext),
    (0, swagger_1.ApiParam)(context_params_1.CONTEXT_PARAMS.contextId),
    (0, swagger_1.ApiBody)(context_bodies_1.CONTEXT_BODIES.updateContext),
    (0, swagger_1.ApiResponse)(update_context_responses_1.UPDATE_CONTEXT_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_context_responses_1.UPDATE_CONTEXT_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_context_responses_1.UPDATE_CONTEXT_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_context_responses_1.UPDATE_CONTEXT_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(update_context_responses_1.UPDATE_CONTEXT_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_context_decorator_1.OrganizationId)()),
    __param(3, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_context_dto_1.UpdateContextDto, String, Object]),
    __metadata("design:returntype", Promise)
], ContextController.prototype, "updateContext", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)(context_operations_1.CONTEXT_OPERATIONS.deleteContext),
    (0, swagger_1.ApiParam)(context_params_1.CONTEXT_PARAMS.contextId),
    (0, swagger_1.ApiResponse)(delete_context_responses_1.DELETE_CONTEXT_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(delete_context_responses_1.DELETE_CONTEXT_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(delete_context_responses_1.DELETE_CONTEXT_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(delete_context_responses_1.DELETE_CONTEXT_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ContextController.prototype, "deleteContext", null);
exports.ContextController = ContextController = __decorate([
    (0, swagger_1.ApiTags)('Context'),
    (0, common_1.Controller)({ path: 'context', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [context_service_1.ContextService])
], ContextController);
//# sourceMappingURL=context.controller.js.map