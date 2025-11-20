"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organization = void 0;
const common_1 = require("@nestjs/common");
const express_1 = require("express");
exports.Organization = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const organizationId = request.organizationId;
    if (!organizationId) {
        throw new Error('Organization ID not found in request. Make sure ApiKeyGuard is applied.');
    }
    return organizationId;
});
//# sourceMappingURL=organization.decorator.js.map