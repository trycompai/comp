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
exports.PeopleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_context_decorator_1 = require("../auth/auth-context.decorator");
const hybrid_auth_guard_1 = require("../auth/hybrid-auth.guard");
const create_people_dto_1 = require("./dto/create-people.dto");
const update_people_dto_1 = require("./dto/update-people.dto");
const bulk_create_people_dto_1 = require("./dto/bulk-create-people.dto");
const people_responses_dto_1 = require("./dto/people-responses.dto");
const people_service_1 = require("./people.service");
const get_all_people_responses_1 = require("./schemas/get-all-people.responses");
const create_member_responses_1 = require("./schemas/create-member.responses");
const bulk_create_members_responses_1 = require("./schemas/bulk-create-members.responses");
const get_person_by_id_responses_1 = require("./schemas/get-person-by-id.responses");
const update_member_responses_1 = require("./schemas/update-member.responses");
const delete_member_responses_1 = require("./schemas/delete-member.responses");
const people_operations_1 = require("./schemas/people-operations");
const people_params_1 = require("./schemas/people-params");
const people_bodies_1 = require("./schemas/people-bodies");
let PeopleController = class PeopleController {
    peopleService;
    constructor(peopleService) {
        this.peopleService = peopleService;
    }
    async getAllPeople(organizationId, authContext) {
        const people = await this.peopleService.findAllByOrganization(organizationId);
        return {
            data: people,
            count: people.length,
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
    async createMember(createData, organizationId, authContext) {
        const member = await this.peopleService.create(organizationId, createData);
        return {
            ...member,
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
    async bulkCreateMembers(bulkCreateData, organizationId, authContext) {
        const result = await this.peopleService.bulkCreate(organizationId, bulkCreateData);
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
    async getPersonById(memberId, organizationId, authContext) {
        const person = await this.peopleService.findById(memberId, organizationId);
        return {
            ...person,
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
    async updateMember(memberId, updateData, organizationId, authContext) {
        const updatedMember = await this.peopleService.updateById(memberId, organizationId, updateData);
        return {
            ...updatedMember,
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
    async deleteMember(memberId, organizationId, authContext) {
        const result = await this.peopleService.deleteById(memberId, organizationId);
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
exports.PeopleController = PeopleController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)(people_operations_1.PEOPLE_OPERATIONS.getAllPeople),
    (0, swagger_1.ApiResponse)(get_all_people_responses_1.GET_ALL_PEOPLE_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_all_people_responses_1.GET_ALL_PEOPLE_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_all_people_responses_1.GET_ALL_PEOPLE_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_all_people_responses_1.GET_ALL_PEOPLE_RESPONSES[500]),
    __param(0, (0, auth_context_decorator_1.OrganizationId)()),
    __param(1, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "getAllPeople", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)(people_operations_1.PEOPLE_OPERATIONS.createMember),
    (0, swagger_1.ApiBody)(people_bodies_1.PEOPLE_BODIES.createMember),
    (0, swagger_1.ApiResponse)(create_member_responses_1.CREATE_MEMBER_RESPONSES[201]),
    (0, swagger_1.ApiResponse)(create_member_responses_1.CREATE_MEMBER_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(create_member_responses_1.CREATE_MEMBER_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(create_member_responses_1.CREATE_MEMBER_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(create_member_responses_1.CREATE_MEMBER_RESPONSES[500]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_people_dto_1.CreatePeopleDto, String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "createMember", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, swagger_1.ApiOperation)(people_operations_1.PEOPLE_OPERATIONS.bulkCreateMembers),
    (0, swagger_1.ApiBody)(people_bodies_1.PEOPLE_BODIES.bulkCreateMembers),
    (0, swagger_1.ApiResponse)(bulk_create_members_responses_1.BULK_CREATE_MEMBERS_RESPONSES[201]),
    (0, swagger_1.ApiResponse)(bulk_create_members_responses_1.BULK_CREATE_MEMBERS_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(bulk_create_members_responses_1.BULK_CREATE_MEMBERS_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(bulk_create_members_responses_1.BULK_CREATE_MEMBERS_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(bulk_create_members_responses_1.BULK_CREATE_MEMBERS_RESPONSES[500]),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_create_people_dto_1.BulkCreatePeopleDto, String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "bulkCreateMembers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)(people_operations_1.PEOPLE_OPERATIONS.getPersonById),
    (0, swagger_1.ApiParam)(people_params_1.PEOPLE_PARAMS.memberId),
    (0, swagger_1.ApiResponse)(get_person_by_id_responses_1.GET_PERSON_BY_ID_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(get_person_by_id_responses_1.GET_PERSON_BY_ID_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(get_person_by_id_responses_1.GET_PERSON_BY_ID_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(get_person_by_id_responses_1.GET_PERSON_BY_ID_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "getPersonById", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)(people_operations_1.PEOPLE_OPERATIONS.updateMember),
    (0, swagger_1.ApiParam)(people_params_1.PEOPLE_PARAMS.memberId),
    (0, swagger_1.ApiBody)(people_bodies_1.PEOPLE_BODIES.updateMember),
    (0, swagger_1.ApiResponse)(update_member_responses_1.UPDATE_MEMBER_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(update_member_responses_1.UPDATE_MEMBER_RESPONSES[400]),
    (0, swagger_1.ApiResponse)(update_member_responses_1.UPDATE_MEMBER_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(update_member_responses_1.UPDATE_MEMBER_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(update_member_responses_1.UPDATE_MEMBER_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_context_decorator_1.OrganizationId)()),
    __param(3, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_people_dto_1.UpdatePeopleDto, String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)(people_operations_1.PEOPLE_OPERATIONS.deleteMember),
    (0, swagger_1.ApiParam)(people_params_1.PEOPLE_PARAMS.memberId),
    (0, swagger_1.ApiResponse)(delete_member_responses_1.DELETE_MEMBER_RESPONSES[200]),
    (0, swagger_1.ApiResponse)(delete_member_responses_1.DELETE_MEMBER_RESPONSES[401]),
    (0, swagger_1.ApiResponse)(delete_member_responses_1.DELETE_MEMBER_RESPONSES[404]),
    (0, swagger_1.ApiResponse)(delete_member_responses_1.DELETE_MEMBER_RESPONSES[500]),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_context_decorator_1.OrganizationId)()),
    __param(2, (0, auth_context_decorator_1.AuthContext)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PeopleController.prototype, "deleteMember", null);
exports.PeopleController = PeopleController = __decorate([
    (0, swagger_1.ApiTags)('People'),
    (0, swagger_1.ApiExtraModels)(people_responses_dto_1.PeopleResponseDto, people_responses_dto_1.UserResponseDto),
    (0, common_1.Controller)({ path: 'people', version: '1' }),
    (0, common_1.UseGuards)(hybrid_auth_guard_1.HybridAuthGuard),
    (0, swagger_1.ApiSecurity)('apikey'),
    (0, swagger_1.ApiHeader)({
        name: 'X-Organization-Id',
        description: 'Organization ID (required for session auth, optional for API key auth)',
        required: false,
    }),
    __metadata("design:paramtypes", [people_service_1.PeopleService])
], PeopleController);
//# sourceMappingURL=people.controller.js.map