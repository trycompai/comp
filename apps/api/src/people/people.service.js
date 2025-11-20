"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PeopleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeopleService = void 0;
const common_1 = require("@nestjs/common");
const member_validator_1 = require("./utils/member-validator");
const member_queries_1 = require("./utils/member-queries");
let PeopleService = PeopleService_1 = class PeopleService {
    logger = new common_1.Logger(PeopleService_1.name);
    async findAllByOrganization(organizationId) {
        try {
            await member_validator_1.MemberValidator.validateOrganization(organizationId);
            const members = await member_queries_1.MemberQueries.findAllByOrganization(organizationId);
            this.logger.log(`Retrieved ${members.length} members for organization ${organizationId}`);
            return members;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve members for organization ${organizationId}:`, error);
            throw new Error(`Failed to retrieve members: ${error.message}`);
        }
    }
    async findById(memberId, organizationId) {
        try {
            await member_validator_1.MemberValidator.validateOrganization(organizationId);
            const member = await member_queries_1.MemberQueries.findByIdInOrganization(memberId, organizationId);
            if (!member) {
                throw new common_1.NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
            }
            this.logger.log(`Retrieved member: ${member.user.name} (${memberId})`);
            return member;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve member ${memberId} in organization ${organizationId}:`, error);
            throw new Error(`Failed to retrieve member: ${error.message}`);
        }
    }
    async create(organizationId, createData) {
        try {
            await member_validator_1.MemberValidator.validateOrganization(organizationId);
            await member_validator_1.MemberValidator.validateUser(createData.userId);
            await member_validator_1.MemberValidator.validateUserNotMember(createData.userId, organizationId);
            const member = await member_queries_1.MemberQueries.createMember(organizationId, createData);
            this.logger.log(`Created member: ${member.user.name} (${member.id}) for organization ${organizationId}`);
            return member;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to create member for organization ${organizationId}:`, error);
            throw new Error(`Failed to create member: ${error.message}`);
        }
    }
    async bulkCreate(organizationId, bulkCreateData) {
        try {
            await member_validator_1.MemberValidator.validateOrganization(organizationId);
            const created = [];
            const errors = [];
            const validMembers = [];
            for (let i = 0; i < bulkCreateData.members.length; i++) {
                const memberData = bulkCreateData.members[i];
                try {
                    await member_validator_1.MemberValidator.validateUser(memberData.userId);
                    await member_validator_1.MemberValidator.validateUserNotMember(memberData.userId, organizationId);
                    validMembers.push(memberData);
                }
                catch (error) {
                    errors.push({
                        index: i,
                        userId: memberData.userId,
                        error: error.message || 'Unknown error occurred',
                    });
                    this.logger.error(`Failed to validate member at index ${i} (userId: ${memberData.userId}):`, error);
                }
            }
            if (validMembers.length > 0) {
                const createdMembers = await member_queries_1.MemberQueries.bulkCreateMembers(organizationId, validMembers);
                created.push(...createdMembers);
                createdMembers.forEach((member) => {
                    this.logger.log(`Created member: ${member.user.name} (${member.id}) for organization ${organizationId}`);
                });
            }
            const summary = {
                total: bulkCreateData.members.length,
                successful: created.length,
                failed: errors.length,
            };
            this.logger.log(`Bulk create completed for organization ${organizationId}: ${summary.successful}/${summary.total} successful`);
            return { created, errors, summary };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to bulk create members for organization ${organizationId}:`, error);
            throw new Error(`Failed to bulk create members: ${error.message}`);
        }
    }
    async updateById(memberId, organizationId, updateData) {
        try {
            await member_validator_1.MemberValidator.validateOrganization(organizationId);
            const existingMember = await member_validator_1.MemberValidator.validateMemberExists(memberId, organizationId);
            if (updateData.userId && updateData.userId !== existingMember.userId) {
                await member_validator_1.MemberValidator.validateUser(updateData.userId);
                await member_validator_1.MemberValidator.validateUserNotMember(updateData.userId, organizationId, memberId);
            }
            const updatedMember = await member_queries_1.MemberQueries.updateMember(memberId, updateData);
            this.logger.log(`Updated member: ${updatedMember.user.name} (${memberId})`);
            return updatedMember;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to update member ${memberId} in organization ${organizationId}:`, error);
            throw new Error(`Failed to update member: ${error.message}`);
        }
    }
    async deleteById(memberId, organizationId) {
        try {
            await member_validator_1.MemberValidator.validateOrganization(organizationId);
            const member = await member_queries_1.MemberQueries.findMemberForDeletion(memberId, organizationId);
            if (!member) {
                throw new common_1.NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
            }
            await member_queries_1.MemberQueries.deleteMember(memberId);
            this.logger.log(`Deleted member: ${member.user.name} (${memberId}) from organization ${organizationId}`);
            return {
                success: true,
                deletedMember: {
                    id: member.id,
                    name: member.user.name,
                    email: member.user.email,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete member ${memberId} from organization ${organizationId}:`, error);
            throw new Error(`Failed to delete member: ${error.message}`);
        }
    }
};
exports.PeopleService = PeopleService;
exports.PeopleService = PeopleService = PeopleService_1 = __decorate([
    (0, common_1.Injectable)()
], PeopleService);
//# sourceMappingURL=people.service.js.map