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
exports.TrustAccessController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const types_1 = require("../auth/types");
const trust_access_dto_1 = require("./dto/trust-access.dto");
const nda_dto_1 = require("./dto/nda.dto");
const trust_access_service_1 = require("./trust-access.service");
let TrustAccessController = class TrustAccessController {
    trustAccessService;
    constructor(trustAccessService) {
        this.trustAccessService = trustAccessService;
    }
    async createAccessRequest(friendlyUrl, dto, req) {
        const ipAddress = req.ip ?? req.socket.remoteAddress ?? undefined;
        const userAgent = typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : undefined;
        return this.trustAccessService.createAccessRequest(friendlyUrl, dto, ipAddress, userAgent);
    }
    async listAccessRequests(organizationId, dto) {
        return this.trustAccessService.listAccessRequests(organizationId, dto);
    }
    async getAccessRequest(organizationId, requestId) {
        return this.trustAccessService.getAccessRequest(organizationId, requestId);
    }
    async approveRequest(organizationId, requestId, dto, req) {
        const userId = req.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('User ID is required');
        }
        const memberId = await this.trustAccessService.getMemberIdFromUserId(userId, organizationId);
        return this.trustAccessService.approveRequest(organizationId, requestId, dto, memberId);
    }
    async denyRequest(organizationId, requestId, dto, req) {
        const userId = req.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('User ID is required');
        }
        const memberId = await this.trustAccessService.getMemberIdFromUserId(userId, organizationId);
        return this.trustAccessService.denyRequest(organizationId, requestId, dto, memberId);
    }
    async listGrants(organizationId) {
        return this.trustAccessService.listGrants(organizationId);
    }
    async revokeGrant(organizationId, grantId, dto, req) {
        const userId = req.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException('User ID is required');
        }
        const memberId = await this.trustAccessService.getMemberIdFromUserId(userId, organizationId);
        return this.trustAccessService.revokeGrant(organizationId, grantId, dto, memberId);
    }
    async getNda(token) {
        return this.trustAccessService.getNdaByToken(token);
    }
    async previewNdaByToken(token) {
        return this.trustAccessService.previewNdaByToken(token);
    }
    async signNda(token, dto, req) {
        if (!dto.accept) {
            throw new Error('You must accept the NDA to proceed');
        }
        const ipAddress = req.ip ?? req.socket.remoteAddress ?? undefined;
        const userAgent = typeof req.headers['user-agent'] === 'string'
            ? req.headers['user-agent']
            : undefined;
        return this.trustAccessService.signNda(token, dto.name, dto.email, ipAddress, userAgent);
    }
    async resendNda(organizationId, requestId) {
        return this.trustAccessService.resendNda(organizationId, requestId);
    }
    async previewNda(organizationId, requestId) {
        return this.trustAccessService.previewNda(organizationId, requestId);
    }
    async reclaimAccess(friendlyUrl, dto) {
        return this.trustAccessService.reclaimAccess(friendlyUrl, dto.email);
    }
    async getGrantByAccessToken(token) {
        return this.trustAccessService.getGrantByAccessToken(token);
    }
    async getPoliciesByAccessToken(token) {
        return this.trustAccessService.getPoliciesByAccessToken(token);
    }
    async downloadAllPolicies(token) {
        return this.trustAccessService.downloadAllPoliciesByAccessToken(token);
    }
};
exports.TrustAccessController = TrustAccessController;
__decorate([
    (0, common_1.Post)(':friendlyUrl/requests'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Submit data access request',
        description: 'External users submit request for data access from trust site',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.CREATED,
        description: 'Access request created and sent for review',
    }),
    __param(0, (0, common_1.Param)('friendlyUrl')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, trust_access_dto_1.CreateAccessRequestDto,
        Request]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "createAccessRequest", null);
__decorate([
    (0, common_1.Get)('admin/requests'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'List access requests',
        description: 'Get all access requests for organization',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Access requests retrieved',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, trust_access_dto_1.ListAccessRequestsDto]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "listAccessRequests", null);
__decorate([
    (0, common_1.Get)('admin/requests/:id'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get access request details',
        description: 'Get detailed information about a specific access request',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Request details returned',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "getAccessRequest", null);
__decorate([
    (0, common_1.Post)('admin/requests/:id/approve'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Approve access request',
        description: 'Approve request and create time-limited grant',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Request approved successfully',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, trust_access_dto_1.ApproveAccessRequestDto,
        Request]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "approveRequest", null);
__decorate([
    (0, common_1.Post)('admin/requests/:id/deny'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Deny access request',
        description: 'Reject access request with reason',
    }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Request denied' }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, trust_access_dto_1.DenyAccessRequestDto,
        Request]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "denyRequest", null);
__decorate([
    (0, common_1.Get)('admin/grants'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'List access grants',
        description: 'Get all active and expired grants',
    }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Grants retrieved' }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "listGrants", null);
__decorate([
    (0, common_1.Post)('admin/grants/:id/revoke'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Revoke access grant',
        description: 'Immediately revoke active grant',
    }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Grant revoked' }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, trust_access_dto_1.RevokeGrantDto,
        Request]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "revokeGrant", null);
__decorate([
    (0, common_1.Get)('nda/:token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get NDA details by token',
        description: 'Fetch NDA agreement details for signing',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'NDA details returned',
    }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "getNda", null);
__decorate([
    (0, common_1.Post)('nda/:token/preview-nda'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Preview NDA by token',
        description: 'Generate preview NDA PDF for external user before signing',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Preview NDA generated',
    }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "previewNdaByToken", null);
__decorate([
    (0, common_1.Post)('nda/:token/sign'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Sign NDA',
        description: 'Sign NDA agreement, generate watermarked PDF, and create access grant',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'NDA signed successfully',
    }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, nda_dto_1.SignNdaDto,
        Request]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "signNda", null);
__decorate([
    (0, common_1.Post)('admin/requests/:id/resend-nda'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Resend NDA email',
        description: 'Resend NDA signing email to requester',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'NDA email resent',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "resendNda", null);
__decorate([
    (0, common_1.Post)('admin/requests/:id/preview-nda'),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID',
        required: true,
    }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Preview NDA PDF',
        description: 'Generate preview NDA with watermark and save to S3 with preview-* prefix',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Preview NDA generated',
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "previewNda", null);
__decorate([
    (0, common_1.Post)(':friendlyUrl/reclaim'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Reclaim access',
        description: 'Generate access link for users with existing grants to redownload data',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Access link sent to email',
    }),
    __param(0, (0, common_1.Param)('friendlyUrl')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, trust_access_dto_1.ReclaimAccessDto]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "reclaimAccess", null);
__decorate([
    (0, common_1.Get)('access/:token'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get grant data by access token',
        description: 'Retrieve compliance data using access token',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Grant data returned',
    }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "getGrantByAccessToken", null);
__decorate([
    (0, common_1.Get)('access/:token/policies'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'List policies by access token',
        description: 'Get list of published policies available for download',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Policies list returned',
    }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "getPoliciesByAccessToken", null);
__decorate([
    (0, common_1.Get)('access/:token/policies/download-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Download all policies as watermarked PDF',
        description: 'Generate combined PDF from all published policy content with watermark',
    }),
    (0, swagger_1.ApiResponse)({
        status: common_1.HttpStatus.OK,
        description: 'Download URL for watermarked PDF returned',
    }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrustAccessController.prototype, "downloadAllPolicies", null);
exports.TrustAccessController = TrustAccessController = __decorate([
    (0, swagger_1.ApiTags)('Trust Access'),
    (0, common_1.Controller)({ path: 'trust-access', version: '1' }),
    __metadata("design:paramtypes", [trust_access_service_1.TrustAccessService])
], TrustAccessController);
//# sourceMappingURL=trust-access.controller.js.map