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
exports.AttachmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const attachments_service_1 = require("./attachments.service");
let AttachmentsController = class AttachmentsController {
    attachmentsService;
    constructor(attachmentsService) {
        this.attachmentsService = attachmentsService;
    }
    async getAttachmentDownloadUrl(organizationId, attachmentId) {
        return await this.attachmentsService.getAttachmentDownloadUrl(organizationId, attachmentId);
    }
};
exports.AttachmentsController = AttachmentsController;
__decorate([
    (0, common_1.Get)(':attachmentId/download'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get attachment download URL',
        description: 'Generate a fresh signed URL for downloading any attachment',
    }),
    (0, swagger_1.ApiParam)({
        name: 'attachmentId',
        description: 'Unique attachment identifier',
        example: 'att_abc123def456',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Download URL generated successfully',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    properties: {
                        downloadUrl: {
                            type: 'string',
                            description: 'Signed URL for downloading the file',
                            example: 'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
                        },
                        expiresIn: {
                            type: 'number',
                            description: 'URL expiration time in seconds',
                            example: 900,
                        },
                    },
                },
            },
        },
    }),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AttachmentsController.prototype, "getAttachmentDownloadUrl", null);
exports.AttachmentsController = AttachmentsController = __decorate([
    (0, swagger_1.ApiTags)('Attachments'),
    (0, common_1.Controller)({ path: 'attachments', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService])
], AttachmentsController);
//# sourceMappingURL=attachments.controller.js.map