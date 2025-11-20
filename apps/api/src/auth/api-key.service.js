"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ApiKeyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
const node_crypto_1 = require("node:crypto");
let ApiKeyService = ApiKeyService_1 = class ApiKeyService {
    logger = new common_1.Logger(ApiKeyService_1.name);
    hashApiKey(apiKey, salt) {
        if (salt) {
            return (0, node_crypto_1.createHash)('sha256')
                .update(apiKey + salt)
                .digest('hex');
        }
        return (0, node_crypto_1.createHash)('sha256').update(apiKey).digest('hex');
    }
    extractApiKey(apiKeyHeader) {
        if (apiKeyHeader) {
            return apiKeyHeader;
        }
        return null;
    }
    async validateApiKey(apiKey) {
        if (!apiKey) {
            return null;
        }
        try {
            if (typeof db_1.db.apiKey === 'undefined') {
                this.logger.error('ApiKey model not found. Make sure to run migrations.');
                return null;
            }
            const apiKeyRecords = await db_1.db.apiKey.findMany({
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                    key: true,
                    salt: true,
                    organizationId: true,
                    expiresAt: true,
                },
            });
            const matchingRecord = apiKeyRecords.find((record) => {
                const hashedKey = record.salt
                    ? this.hashApiKey(apiKey, record.salt)
                    : this.hashApiKey(apiKey);
                return hashedKey === record.key;
            });
            if (!matchingRecord ||
                (matchingRecord.expiresAt && matchingRecord.expiresAt < new Date())) {
                this.logger.warn('Invalid or expired API key attempted');
                return null;
            }
            await db_1.db.apiKey.update({
                where: {
                    id: matchingRecord.id,
                },
                data: {
                    lastUsedAt: new Date(),
                },
            });
            this.logger.log(`Valid API key used for organization: ${matchingRecord.organizationId}`);
            return matchingRecord.organizationId;
        }
        catch (error) {
            this.logger.error('Error validating API key:', error);
            return null;
        }
    }
};
exports.ApiKeyService = ApiKeyService;
exports.ApiKeyService = ApiKeyService = ApiKeyService_1 = __decorate([
    (0, common_1.Injectable)()
], ApiKeyService);
//# sourceMappingURL=api-key.service.js.map