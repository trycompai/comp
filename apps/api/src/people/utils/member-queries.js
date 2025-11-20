"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberQueries = void 0;
const db_1 = require("@trycompai/db");
class MemberQueries {
    static MEMBER_SELECT = {
        id: true,
        organizationId: true,
        userId: true,
        role: true,
        createdAt: true,
        department: true,
        isActive: true,
        fleetDmLabelId: true,
        user: {
            select: {
                id: true,
                name: true,
                email: true,
                emailVerified: true,
                image: true,
                createdAt: true,
                updatedAt: true,
                lastLogin: true,
            },
        },
    };
    static async findAllByOrganization(organizationId) {
        return db_1.db.member.findMany({
            where: { organizationId },
            select: this.MEMBER_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    static async findByIdInOrganization(memberId, organizationId) {
        return db_1.db.member.findFirst({
            where: {
                id: memberId,
                organizationId,
            },
            select: this.MEMBER_SELECT,
        });
    }
    static async createMember(organizationId, createData) {
        return db_1.db.member.create({
            data: {
                organizationId,
                userId: createData.userId,
                role: createData.role,
                department: createData.department || 'none',
                isActive: createData.isActive ?? true,
                fleetDmLabelId: createData.fleetDmLabelId || null,
            },
            select: this.MEMBER_SELECT,
        });
    }
    static async updateMember(memberId, updateData) {
        const updatePayload = { ...updateData };
        if (updateData.fleetDmLabelId === undefined &&
            'fleetDmLabelId' in updateData) {
            updatePayload.fleetDmLabelId = null;
        }
        return db_1.db.member.update({
            where: { id: memberId },
            data: updatePayload,
            select: this.MEMBER_SELECT,
        });
    }
    static async findMemberForDeletion(memberId, organizationId) {
        return db_1.db.member.findFirst({
            where: {
                id: memberId,
                organizationId,
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
    static async deleteMember(memberId) {
        await db_1.db.member.delete({
            where: { id: memberId },
        });
    }
    static async bulkCreateMembers(organizationId, memberData) {
        const data = memberData.map((member) => ({
            organizationId,
            userId: member.userId,
            role: member.role,
            department: member.department || 'none',
            isActive: member.isActive ?? true,
            fleetDmLabelId: member.fleetDmLabelId || null,
        }));
        await db_1.db.member.createMany({
            data,
            skipDuplicates: true,
        });
        return db_1.db.member.findMany({
            where: {
                organizationId,
                userId: { in: memberData.map((m) => m.userId) },
            },
            select: this.MEMBER_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.MemberQueries = MemberQueries;
//# sourceMappingURL=member-queries.js.map