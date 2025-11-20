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
exports.DeviceAgentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const device_agent_service_1 = require("./device-agent.service");
const device_agent_operations_1 = require("./schemas/device-agent-operations");
const download_mac_agent_responses_1 = require("./schemas/download-mac-agent.responses");
const download_windows_agent_responses_1 = require("./schemas/download-windows-agent.responses");
let DeviceAgentController = class DeviceAgentController {
    deviceAgentService;
    constructor(deviceAgentService) {
        this.deviceAgentService = deviceAgentService;
    }
    async downloadMacAgent(organizationId, authContext, res) {
        const { stream, filename, contentType } = await this.deviceAgentService.downloadMacAgent();
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        });
        return new common_1.StreamableFile(stream);
    }
    async downloadWindowsAgent(organizationId, authContext, res) {
        const employeeId = authContext.userId || 'unknown-user';
        const { stream, filename, contentType } = await this.deviceAgentService.downloadWindowsAgent(organizationId, employeeId);
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
        });
        return new common_1.StreamableFile(stream);
    }
};
exports.DeviceAgentController = DeviceAgentController;
__decorate([
    (0, common_1.Get)('mac'),
    (0, swagger_1.ApiOperation)(device_agent_operations_1.DEVICE_AGENT_OPERATIONS.downloadMacAgent),
    (0, swagger_1.ApiResponse)(download_mac_agent_responses_1.DOWNLOAD_MAC_AGENT_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(download_mac_agent_responses_1.DOWNLOAD_MAC_AGENT_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(download_mac_agent_responses_1.DOWNLOAD_MAC_AGENT_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(download_mac_agent_responses_1.DOWNLOAD_MAC_AGENT_RESPONSES[500]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Response)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DeviceAgentController.prototype, "downloadMacAgent", null);
__decorate([
    (0, common_1.Get)('windows'),
    (0, swagger_1.ApiOperation)(device_agent_operations_1.DEVICE_AGENT_OPERATIONS.downloadWindowsAgent),
    (0, swagger_1.ApiResponse)(download_windows_agent_responses_1.DOWNLOAD_WINDOWS_AGENT_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(download_windows_agent_responses_1.DOWNLOAD_WINDOWS_AGENT_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(download_windows_agent_responses_1.DOWNLOAD_WINDOWS_AGENT_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(download_windows_agent_responses_1.DOWNLOAD_WINDOWS_AGENT_RESPONSES[500]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __param(2, (0, common_1.Response)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DeviceAgentController.prototype, "downloadWindowsAgent", null);
exports.DeviceAgentController = DeviceAgentController = __decorate([
    (0, swagger_1.ApiTags)('Device Agent'),
    (0, common_1.Controller)({ path: 'device-agent', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [device_agent_service_1.DeviceAgentService])
], DeviceAgentController);
//# sourceMappingURL=device-agent.controller.js.map