"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TrustPortalService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustPortalService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importStar(require("axios"));
const domain_status_dto_1 = require("./dto/domain-status.dto");
let TrustPortalService = TrustPortalService_1 = class TrustPortalService {
    logger = new common_1.Logger(TrustPortalService_1.name);
    vercelApi;
    constructor() {
        const bearerToken = process.env.VERCEL_ACCESS_TOKEN;
        if (!bearerToken) {
            this.logger.warn('VERCEL_ACCESS_TOKEN is not set');
        }
        this.vercelApi = axios_1.default.create({
            baseURL: 'https://api.vercel.com',
            headers: {
                Authorization: `Bearer ${bearerToken || ''}`,
                'Content-Type': 'application/json',
            },
        });
    }
    async getDomainStatus(dto) {
        const { domain } = dto;
        if (!process.env.TRUST_PORTAL_PROJECT_ID) {
            throw new common_1.InternalServerErrorException('TRUST_PORTAL_PROJECT_ID is not configured');
        }
        if (!process.env.VERCEL_TEAM_ID) {
            throw new common_1.InternalServerErrorException('VERCEL_TEAM_ID is not configured');
        }
        if (!domain) {
            throw new common_1.BadRequestException('Domain is required');
        }
        try {
            this.logger.log(`Fetching domain status for: ${domain}`);
            const response = await this.vercelApi.get(`/v9/projects/${process.env.TRUST_PORTAL_PROJECT_ID}/domains/${domain}`, {
                params: {
                    teamId: process.env.VERCEL_TEAM_ID,
                },
            });
            const domainInfo = response.data;
            const verification = domainInfo.verification?.map((v) => ({
                type: v.type,
                domain: v.domain,
                value: v.value,
                reason: v.reason,
            }));
            return {
                domain: domainInfo.name,
                verified: domainInfo.verified ?? false,
                verification,
            };
        }
        catch (error) {
            this.logger.error(`Failed to get domain status for ${domain}:`, error instanceof Error ? error.stack : error);
            if (axios_1.default.isAxiosError(error)) {
                const statusCode = error.response?.status;
                const message = error.response?.data?.error?.message || error.message;
                this.logger.error(`Vercel API error (${statusCode}): ${message}`);
            }
            throw new common_1.InternalServerErrorException('Failed to get domain status from Vercel');
        }
    }
};
exports.TrustPortalService = TrustPortalService;
exports.TrustPortalService = TrustPortalService = TrustPortalService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TrustPortalService);
//# sourceMappingURL=trust-portal.service.js.map