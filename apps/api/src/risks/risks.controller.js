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
exports.RisksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const create_risk_dto_1 = require("./dto/create-risk.dto");
const update_risk_dto_1 = require("./dto/update-risk.dto");
const risks_service_1 = require("./risks.service");
const risk_operations_1 = require("./schemas/risk-operations");
const risk_params_1 = require("./schemas/risk-params");
const risk_bodies_1 = require("./schemas/risk-bodies");
const get_all_risks_responses_1 = require("./schemas/get-all-risks.responses");
const get_risk_by_id_responses_1 = require("./schemas/get-risk-by-id.responses");
const create_risk_responses_1 = require("./schemas/create-risk.responses");
const update_risk_responses_1 = require("./schemas/update-risk.responses");
const delete_risk_responses_1 = require("./schemas/delete-risk.responses");
let RisksController = class RisksController {
    risksService;
    constructor(risksService) {
        this.risksService = risksService;
    }
    async getAllRisks(organizationId, authContext) {
        const risks = await this.risksService.findAllByOrganization(organizationId);
        return {
            data: risks,
            count: risks.length,
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
    async getRiskById(riskId, organizationId, authContext) {
        const risk = await this.risksService.findById(riskId, organizationId);
        return {
            ...risk,
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
    async createRisk(createRiskDto, organizationId, authContext) {
        const risk = await this.risksService.create(organizationId, createRiskDto);
        return {
            ...risk,
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
    async updateRisk(riskId, updateRiskDto, organizationId, authContext) {
        const updatedRisk = await this.risksService.updateById(riskId, organizationId, updateRiskDto);
        return {
            ...updatedRisk,
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
    async deleteRisk(riskId, organizationId, authContext) {
        const result = await this.risksService.deleteById(riskId, organizationId);
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
exports.RisksController = RisksController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)(risk_operations_1.RISK_OPERATIONS.getAllRisks),
    (0, swagger_1.ApiResponse)(get_all_risks_responses_1.GET_ALL_RISKS_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_all_risks_responses_1.GET_ALL_RISKS_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_all_risks_responses_1.GET_ALL_RISKS_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_all_risks_responses_1.GET_ALL_RISKS_RESPONSES[500]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RisksController.prototype, "getAllRisks", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)(risk_operations_1.RISK_OPERATIONS.getRiskById),
    (0, swagger_1.ApiParam)(risk_params_1.RISK_PARAMS.riskId),
    (0, swagger_1.ApiResponse)(get_risk_by_id_responses_1.GET_RISK_BY_ID_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_risk_by_id_responses_1.GET_RISK_BY_ID_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_risk_by_id_responses_1.GET_RISK_BY_ID_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_risk_by_id_responses_1.GET_RISK_BY_ID_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RisksController.prototype, "getRiskById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)(risk_operations_1.RISK_OPERATIONS.createRisk),
    (0, swagger_1.ApiBody)(risk_bodies_1.RISK_BODIES.createRisk),
    (0, swagger_1.ApiResponse)(create_risk_responses_1.CREATE_RISK_RESPONSES[201]),
    (0, swagger_1.ApiResponse)(create_risk_responses_1.CREATE_RISK_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(create_risk_responses_1.CREATE_RISK_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(create_risk_responses_1.CREATE_RISK_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(create_risk_responses_1.CREATE_RISK_RESPONSES[500]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_risk_dto_1.CreateRiskDto, String, Object]),
    __metadata("design:returntype", Promise)
], RisksController.prototype, "createRisk", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)(risk_operations_1.RISK_OPERATIONS.updateRisk),
    (0, swagger_1.ApiParam)(risk_params_1.RISK_PARAMS.riskId),
    (0, swagger_1.ApiBody)(risk_bodies_1.RISK_BODIES.updateRisk),
    (0, swagger_1.ApiResponse)(update_risk_responses_1.UPDATE_RISK_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_risk_responses_1.UPDATE_RISK_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_risk_responses_1.UPDATE_RISK_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_risk_responses_1.UPDATE_RISK_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(update_risk_responses_1.UPDATE_RISK_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_context_decorator_1.OrganizationId)()),
    __param(3, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_risk_dto_1.UpdateRiskDto, String, Object]),
    __metadata("design:returntype", Promise)
], RisksController.prototype, "updateRisk", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)(risk_operations_1.RISK_OPERATIONS.deleteRisk),
    (0, swagger_1.ApiParam)(risk_params_1.RISK_PARAMS.riskId),
    (0, swagger_1.ApiResponse)(delete_risk_responses_1.DELETE_RISK_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(delete_risk_responses_1.DELETE_RISK_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(delete_risk_responses_1.DELETE_RISK_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(delete_risk_responses_1.DELETE_RISK_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], RisksController.prototype, "deleteRisk", null);
exports.RisksController = RisksController = __decorate([
    (0, swagger_1.ApiTags)('Risks'),
    (0, common_1.Controller)({ path: 'risks', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [risks_service_1.RisksService])
], RisksController);
//# sourceMappingURL=risks.controller.js.map