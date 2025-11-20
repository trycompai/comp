"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TrustEmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustEmailService = void 0;
const common_1 = require("@nestjs/common");
const email_1 = require("@trycompai/email");
let TrustEmailService = TrustEmailService_1 = class TrustEmailService {
    logger = new common_1.Logger(TrustEmailService_1.name);
    async sendNdaSigningEmail(params) {
        const { toEmail, toName, organizationName, ndaSigningLink } = params;
        const { id } = await (0, email_1.sendEmail)({
            to: toEmail,
            subject: `NDA Signature Required - ${organizationName}`,
            react: (0, email_1.NdaSigningEmail)({
                toName,
                organizationName,
                ndaSigningLink,
            }),
            system: true,
        });
        this.logger.log(`NDA signing email sent to ${toEmail} (ID: ${id})`);
    }
    async sendAccessGrantedEmail(params) {
        const { toEmail, toName, organizationName, expiresAt, portalUrl } = params;
        const { id } = await (0, email_1.sendEmail)({
            to: toEmail,
            subject: `Access Granted - ${organizationName}`,
            react: (0, email_1.AccessGrantedEmail)({
                toName,
                organizationName,
                expiresAt,
                portalUrl,
            }),
            system: true,
        });
        this.logger.log(`Access granted email sent to ${toEmail} (ID: ${id})`);
    }
    async sendAccessReclaimEmail(params) {
        const { toEmail, toName, organizationName, accessLink, expiresAt } = params;
        const { id } = await (0, email_1.sendEmail)({
            to: toEmail,
            subject: `Access Your Compliance Data - ${organizationName}`,
            react: (0, email_1.AccessReclaimEmail)({
                toName,
                organizationName,
                accessLink,
                expiresAt,
            }),
            system: true,
        });
        this.logger.log(`Access reclaim email sent to ${toEmail} (ID: ${id})`);
    }
};
exports.TrustEmailService = TrustEmailService;
exports.TrustEmailService = TrustEmailService = TrustEmailService_1 = __decorate([
    (0, common_1.Injectable)()
], TrustEmailService);
//# sourceMappingURL=email.service.js.map