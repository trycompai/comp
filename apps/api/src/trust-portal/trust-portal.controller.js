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
exports.TrustPortalController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const domain_status_dto_1 = require("./dto/domain-status.dto");
const trust_portal_service_1 = require("./trust-portal.service");
let TrustPortalController = class TrustPortalController {
    trustPortalService;
    constructor(trustPortalService) {
        this.trustPortalService = trustPortalService;
    }
    async getDomainStatus(dto) {
        return this.trustPortalService.getDomainStatus(dto);
    }
};
exports.TrustPortalController = TrustPortalController;
__decorate([
    (0, common_1.Get)('domain/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get domain verification status',
        description: 'Retrieve the verification status and DNS records for a custom domain configured in the Vercel trust portal project',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'domain',
        description: 'The domain name to check status for',
        example: 'portal.example.com',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Domain status retrieved successfully',
        type: domain_status_dto_1.DomainStatusResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'Failed to retrieve domain status from Vercel',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized - Invalid or missing authentication',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [domain_status_dto_1.GetDomainStatusDto]),
    __metadata("design:returntype", Promise)
], TrustPortalController.prototype, "getDomainStatus", null);
exports.TrustPortalController = TrustPortalController = __decorate([
    (0, swagger_1.ApiTags)('Trust Portal'),
    (0, common_1.Controller)({ path: 'trust-portal', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [trust_portal_service_1.TrustPortalService])
], TrustPortalController);
//# sourceMappingURL=trust-portal.controller.js.map