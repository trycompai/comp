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
exports.VendorsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const create_vendor_responses_1 = require("./schemas/create-vendor.responses");
const delete_vendor_responses_1 = require("./schemas/delete-vendor.responses");
const get_all_vendors_responses_1 = require("./schemas/get-all-vendors.responses");
const get_vendor_by_id_responses_1 = require("./schemas/get-vendor-by-id.responses");
const update_vendor_responses_1 = require("./schemas/update-vendor.responses");
const vendor_bodies_1 = require("./schemas/vendor-bodies");
const vendor_operations_1 = require("./schemas/vendor-operations");
const vendor_params_1 = require("./schemas/vendor-params");
let VendorsController = class VendorsController {
    vendorsService;
    constructor(vendorsService) {
        this.vendorsService = vendorsService;
    }
    async getAllVendors(organizationId, authContext) {
        const vendors = await this.vendorsService.findAllByOrganization(organizationId);
        return {
            data: vendors,
            count: vendors.length,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async getVendorById(vendorId, organizationId, authContext) {
        const vendor = await this.vendorsService.findById(vendorId, organizationId);
        return {
            ...vendor,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async createVendor(createVendorDto, organizationId, authContext) {
        const vendor = await this.vendorsService.create(organizationId, createVendorDto);
        return {
            ...vendor,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async updateVendor(vendorId, updateVendorDto, organizationId, authContext) {
        const updatedVendor = await this.vendorsService.updateById(vendorId, organizationId, updateVendorDto);
        return {
            ...updatedVendor,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
    async deleteVendor(vendorId, organizationId, authContext) {
        const result = await this.vendorsService.deleteById(vendorId, organizationId);
        return {
            ...result,
            authType: authContext.authType,
            ...(authContext.userId &&
                authContext.userEmail && {
                authenticatedUser: {
                    id: authContext.userId,
                    email: authContext.userEmail,
                },
            }),
        };
    }
};
exports.VendorsController = VendorsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)(vendor_operations_1.VENDOR_OPERATIONS.getAllVendors),
    (0, swagger_1.ApiResponse)(get_all_vendors_responses_1.GET_ALL_VENDORS_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_all_vendors_responses_1.GET_ALL_VENDORS_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_all_vendors_responses_1.GET_ALL_VENDORS_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_all_vendors_responses_1.GET_ALL_VENDORS_RESPONSES[500]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "getAllVendors", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)(vendor_operations_1.VENDOR_OPERATIONS.getVendorById),
    (0, swagger_1.ApiParam)(vendor_params_1.VENDOR_PARAMS.vendorId),
    (0, swagger_1.ApiResponse)(get_vendor_by_id_responses_1.GET_VENDOR_BY_ID_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_vendor_by_id_responses_1.GET_VENDOR_BY_ID_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_vendor_by_id_responses_1.GET_VENDOR_BY_ID_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_vendor_by_id_responses_1.GET_VENDOR_BY_ID_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "getVendorById", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)(vendor_operations_1.VENDOR_OPERATIONS.createVendor),
    (0, swagger_1.ApiBody)(vendor_bodies_1.VENDOR_BODIES.createVendor),
    (0, swagger_1.ApiResponse)(create_vendor_responses_1.CREATE_VENDOR_RESPONSES[201]),
    (0, swagger_1.ApiResponse)(create_vendor_responses_1.CREATE_VENDOR_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(create_vendor_responses_1.CREATE_VENDOR_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(create_vendor_responses_1.CREATE_VENDOR_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(create_vendor_responses_1.CREATE_VENDOR_RESPONSES[500]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function, String, Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "createVendor", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)(vendor_operations_1.VENDOR_OPERATIONS.updateVendor),
    (0, swagger_1.ApiParam)(vendor_params_1.VENDOR_PARAMS.vendorId),
    (0, swagger_1.ApiBody)(vendor_bodies_1.VENDOR_BODIES.updateVendor),
    (0, swagger_1.ApiResponse)(update_vendor_responses_1.UPDATE_VENDOR_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_vendor_responses_1.UPDATE_VENDOR_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_vendor_responses_1.UPDATE_VENDOR_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_vendor_responses_1.UPDATE_VENDOR_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(update_vendor_responses_1.UPDATE_VENDOR_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_context_decorator_1.OrganizationId)()),
    __param(3, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Function, String, Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "updateVendor", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)(vendor_operations_1.VENDOR_OPERATIONS.deleteVendor),
    (0, swagger_1.ApiParam)(vendor_params_1.VENDOR_PARAMS.vendorId),
    (0, swagger_1.ApiResponse)(delete_vendor_responses_1.DELETE_VENDOR_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(delete_vendor_responses_1.DELETE_VENDOR_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(delete_vendor_responses_1.DELETE_VENDOR_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(delete_vendor_responses_1.DELETE_VENDOR_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VendorsController.prototype, "deleteVendor", null);
exports.VendorsController = VendorsController = __decorate([
    (0, swagger_1.ApiTags)('Vendors'),
    (0, common_1.Controller)({ path: 'vendors', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [Function])
], VendorsController);
//# sourceMappingURL=vendors.controller.js.map