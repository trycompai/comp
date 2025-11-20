"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustPortalModule = void 0;
const common_1 = require("@nestjs/common");
const attachments_module_1 = require("../attachments/attachments.module");
const auth_module_1 = require("../auth/auth.module");
const email_service_1 = require("./email.service");
const nda_pdf_service_1 = require("./nda-pdf.service");
const policy_pdf_renderer_service_1 = require("./policy-pdf-renderer.service");
const trust_access_controller_1 = require("./trust-access.controller");
const trust_access_service_1 = require("./trust-access.service");
const trust_portal_controller_1 = require("./trust-portal.controller");
const trust_portal_service_1 = require("./trust-portal.service");
let TrustPortalModule = class TrustPortalModule {
};
exports.TrustPortalModule = TrustPortalModule;
exports.TrustPortalModule = TrustPortalModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, attachments_module_1.AttachmentsModule],
        controllers: [trust_portal_controller_1.TrustPortalController, trust_access_controller_1.TrustAccessController],
        providers: [
            trust_portal_service_1.TrustPortalService,
            trust_access_service_1.TrustAccessService,
            nda_pdf_service_1.NdaPdfService,
            email_service_1.TrustEmailService,
            policy_pdf_renderer_service_1.PolicyPdfRendererService,
        ],
        exports: [trust_portal_service_1.TrustPortalService, trust_access_service_1.TrustAccessService],
    })
], TrustPortalModule);
//# sourceMappingURL=trust-portal.module.js.map