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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const db_1 = require("@trycompai/db");
const jose_1 = require("jose");
const api_key_service_1 = require("./api-key.service");
const types_1 = require("./types");
let HybridAuthGuard = class HybridAuthGuard {
    apiKeyService;
    configService;
    betterAuthUrl;
    constructor(apiKeyService, configService) {
        this.apiKeyService = apiKeyService;
        this.configService = configService;
        const betterAuthConfig = this.configService.get('betterAuth');
        this.betterAuthUrl =
            betterAuthConfig?.url || process.env.BETTER_AUTH_URL || '';
        if (!this.betterAuthUrl) {
            console.warn('[HybridAuthGuard] BETTER_AUTH_URL not configured. JWT authentication will fail.');
        }
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];
        if (apiKey) {
            return this.handleApiKeyAuth(request, apiKey);
        }
        const authHeader = request.headers['authorization'];
        if (authHeader?.startsWith('Bearer ')) {
            return this.handleJwtAuth(request, authHeader);
        }
        throw new common_1.UnauthorizedException('Authentication required: Provide either X-API-Key or Bearer JWT token');
    }
    async handleApiKeyAuth(request, apiKey) {
        const extractedKey = this.apiKeyService.extractApiKey(apiKey);
        if (!extractedKey) {
            throw new common_1.UnauthorizedException('Invalid API key format');
        }
        const organizationId = await this.apiKeyService.validateApiKey(extractedKey);
        if (!organizationId) {
            throw new common_1.UnauthorizedException('Invalid or expired API key');
        }
        request.organizationId = organizationId;
        request.authType = 'api-key';
        request.isApiKey = true;
        return true;
    }
    async handleJwtAuth(request, authHeader) {
        try {
            if (!this.betterAuthUrl) {
                console.error('[HybridAuthGuard] BETTER_AUTH_URL environment variable is not set');
                throw new common_1.UnauthorizedException('Authentication configuration error: BETTER_AUTH_URL not configured');
            }
            const token = authHeader.substring(7);
            const jwksUrl = `${this.betterAuthUrl}/api/auth/jwks`;
            const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl), {
                cacheMaxAge: 60000,
                cooldownDuration: 10000,
            });
            let payload;
            try {
                payload = (await (0, jose_1.jwtVerify)(token, JWKS, {
                    issuer: this.betterAuthUrl,
                    audience: this.betterAuthUrl,
                })).payload;
            }
            catch (verifyError) {
                if (verifyError.code === 'ERR_JWKS_NO_MATCHING_KEY' ||
                    verifyError.message?.includes('no applicable key found') ||
                    verifyError.message?.includes('JWKSNoMatchingKey')) {
                    console.log('[HybridAuthGuard] Key mismatch detected, fetching fresh JWKS and retrying...');
                    const freshJWKS = (0, jose_1.createRemoteJWKSet)(new URL(jwksUrl), {
                        cacheMaxAge: 0,
                        cooldownDuration: 0,
                    });
                    payload = (await (0, jose_1.jwtVerify)(token, freshJWKS, {
                        issuer: this.betterAuthUrl,
                        audience: this.betterAuthUrl,
                    })).payload;
                    console.log('[HybridAuthGuard] Successfully verified token with fresh JWKS');
                }
                else {
                    throw verifyError;
                }
            }
            const userId = payload.id;
            const userEmail = payload.email;
            if (!userId) {
                throw new common_1.UnauthorizedException('Invalid JWT payload: missing user information');
            }
            const explicitOrgId = request.headers['x-organization-id'];
            if (!explicitOrgId) {
                throw new common_1.UnauthorizedException('Organization context required: X-Organization-Id header is mandatory for JWT authentication');
            }
            const hasAccess = await this.verifyUserOrgAccess(userId, explicitOrgId);
            if (!hasAccess) {
                throw new common_1.UnauthorizedException(`User does not have access to organization: ${explicitOrgId}`);
            }
            request.userId = userId;
            request.userEmail = userEmail;
            request.organizationId = explicitOrgId;
            request.authType = 'jwt';
            request.isApiKey = false;
            return true;
        }
        catch (error) {
            console.error('JWT verification failed:', error);
            if (error instanceof Error) {
                if (error.message.includes('ECONNREFUSED') ||
                    error.message.includes('fetch failed')) {
                    console.error(`[HybridAuthGuard] Cannot connect to Better Auth JWKS endpoint at ${this.betterAuthUrl}/api/auth/jwks`);
                    console.error('[HybridAuthGuard] Make sure BETTER_AUTH_URL is set correctly and the Better Auth server is running');
                    throw new common_1.UnauthorizedException(`Cannot connect to authentication service. Please check BETTER_AUTH_URL configuration.`);
                }
                if (error.code === 'ERR_JWKS_NO_MATCHING_KEY' ||
                    error.message.includes('no applicable key found') ||
                    error.message.includes('JWKSNoMatchingKey')) {
                    console.error('[HybridAuthGuard] Token key not found even after fetching fresh JWKS. Token may be from a different environment or truly invalid.');
                    throw new common_1.UnauthorizedException('Authentication token is invalid. Please log out and log back in to refresh your session.');
                }
            }
            throw new common_1.UnauthorizedException('Invalid or expired JWT token');
        }
    }
    async verifyUserOrgAccess(userId, organizationId) {
        try {
            const member = await db_1.db.member.findFirst({
                where: {
                    userId,
                    organizationId,
                },
                select: {
                    id: true,
                    role: true,
                },
            });
            return !!member;
        }
        catch (error) {
            console.error('Error verifying user organization access:', error);
            return false;
        }
    }
};
exports.HybridAuthGuard = HybridAuthGuard;
exports.HybridAuthGuard = HybridAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [api_key_service_1.ApiKeyService,
        config_1.ConfigService])
], HybridAuthGuard);
//# sourceMappingURL=hybrid-auth.guard.js.map