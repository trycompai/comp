"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsApiKeyAuth = exports.UserId = exports.OrganizationId = exports.AuthContext = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("./types");
exports.AuthContext = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const { organizationId, authType, isApiKey, userId, userEmail } = request;
    if (!organizationId || !authType) {
        throw new Error('Authentication context not found. Ensure HybridAuthGuard is applied.');
    }
    return {
        organizationId,
        authType,
        isApiKey,
        userId,
        userEmail,
    };
});
exports.OrganizationId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const { organizationId } = request;
    if (!organizationId) {
        throw new Error('Organization ID not found. Ensure HybridAuthGuard is applied.');
    }
    return organizationId;
});
exports.UserId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const { userId, authType } = request;
    if (authType === 'api-key') {
        throw new Error('User ID is not available for API key authentication');
    }
    if (!userId) {
        throw new Error('User ID not found. Ensure HybridAuthGuard is applied and using session auth.');
    }
    return userId;
});
exports.IsApiKeyAuth = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.isApiKey;
});
//# sourceMappingURL=auth-context.decorator.js.map