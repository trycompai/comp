"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberValidator = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@trycompai/db");
class MemberValidator {
    static async validateOrganization(organizationId) {
        const organization = await db_1.db.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, name: true },
        });
        if (!organization) {
            throw new common_1.NotFoundException(`Organization with ID ${organizationId} not found`);
        }
    }
    static async validateUser(userId) {
        const user = await db_1.db.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return user;
    }
    static async validateMemberExists(memberId, organizationId) {
        const member = await db_1.db.member.findFirst({
            where: {
                id: memberId,
                organizationId,
            },
            select: { id: true, userId: true },
        });
        if (!member) {
            throw new common_1.NotFoundException(`Member with ID ${memberId} not found in organization ${organizationId}`);
        }
        return member;
    }
    static async validateUserNotMember(userId, organizationId, excludeMemberId) {
        const whereClause = {
            userId,
            organizationId,
        };
        if (excludeMemberId) {
            whereClause.id = { not: excludeMemberId };
        }
        const existingMember = await db_1.db.member.findFirst({
            where: whereClause,
        });
        if (existingMember) {
            const user = await this.validateUser(userId);
            throw new common_1.BadRequestException(`User ${user.email} is already a member of this organization`);
        }
    }
}
exports.MemberValidator = MemberValidator;
//# sourceMappingURL=member-validator.js.map