import { db } from '@trycompai/db';
import type { PeopleResponseDto } from '../dto/people-responses.dto';
import type { CreatePeopleDto } from '../dto/create-people.dto';
import type { UpdatePeopleDto } from '../dto/update-people.dto';

/**
 * Common database queries for member operations
 */
export class MemberQueries {
  /**
   * Standard member selection fields
   */
  static readonly MEMBER_SELECT = {
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
        isPlatformAdmin: true,
      },
    },
  } as const;

  /**
   * Get all members for an organization
   */
  static async findAllByOrganization(
    organizationId: string,
    includeDeactivated = false,
  ): Promise<PeopleResponseDto[]> {
    return db.member.findMany({
      where: {
        organizationId,
        ...(includeDeactivated ? {} : { deactivated: false }),
      },
      select: this.MEMBER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a member by ID within an organization
   */
  static async findByIdInOrganization(
    memberId: string,
    organizationId: string,
  ): Promise<PeopleResponseDto | null> {
    return db.member.findFirst({
      where: {
        id: memberId,
        organizationId,
        deactivated: false,
      },
      select: this.MEMBER_SELECT,
    });
  }

  /**
   * Create a new member
   */
  static async createMember(
    organizationId: string,
    createData: CreatePeopleDto,
  ): Promise<PeopleResponseDto> {
    return db.member.create({
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

  /**
   * Update a member by ID
   */
  static async updateMember(
    memberId: string,
    updateData: UpdatePeopleDto,
  ): Promise<PeopleResponseDto> {
    // Separate user-level fields from member-level fields
    const { name, email, createdAt, ...memberFields } = updateData;

    // Prepare member update data
    const updatePayload: any = { ...memberFields };

    // Convert createdAt string to Date for Prisma
    if (createdAt !== undefined) {
      updatePayload.createdAt = new Date(createdAt);
    }

    // Handle fleetDmLabelId: convert undefined to null for database
    if (
      memberFields.fleetDmLabelId === undefined &&
      'fleetDmLabelId' in memberFields
    ) {
      updatePayload.fleetDmLabelId = null;
    }

    const hasUserUpdates =
      name !== undefined || email !== undefined;
    const hasMemberUpdates = Object.keys(updatePayload).length > 0;

    // If we need to update both user and member, use a transaction
    if (hasUserUpdates) {
      return db.$transaction(async (tx) => {
        // Get the member to find the associated userId
        const member = await tx.member.findUniqueOrThrow({
          where: { id: memberId },
          select: { userId: true },
        });

        // Update user fields
        const userUpdateData: { name?: string; email?: string } = {};
        if (name !== undefined) userUpdateData.name = name;
        if (email !== undefined) userUpdateData.email = email;

        await tx.user.update({
          where: { id: member.userId },
          data: userUpdateData,
        });

        // Update member fields if any
        if (hasMemberUpdates) {
          return tx.member.update({
            where: { id: memberId },
            data: updatePayload,
            select: this.MEMBER_SELECT,
          });
        }

        // Return updated member with fresh user data
        return tx.member.findUniqueOrThrow({
          where: { id: memberId },
          select: this.MEMBER_SELECT,
        });
      });
    }

    // Only member-level updates
    return db.member.update({
      where: { id: memberId },
      data: updatePayload,
      select: this.MEMBER_SELECT,
    });
  }

  /**
   * Get member for deletion (with minimal user info)
   */
  static async findMemberForDeletion(
    memberId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    user: { id: string; name: string; email: string };
  } | null> {
    return db.member.findFirst({
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

  /**
   * Delete a member by ID
   */
  static async deleteMember(memberId: string): Promise<void> {
    await db.member.delete({
      where: { id: memberId },
    });
  }

  /**
   * Unlink device by resetting fleetDmLabelId to null
   */
  static async unlinkDevice(memberId: string): Promise<PeopleResponseDto> {
    return db.member.update({
      where: { id: memberId },
      data: { fleetDmLabelId: null },
      select: this.MEMBER_SELECT,
    });
  }

  /**
   * Bulk create members for an organization
   */
  static async bulkCreateMembers(
    organizationId: string,
    memberData: CreatePeopleDto[],
  ): Promise<PeopleResponseDto[]> {
    // Prepare data for createMany
    const data = memberData.map((member) => ({
      organizationId,
      userId: member.userId,
      role: member.role,
      department: member.department || 'none',
      isActive: member.isActive ?? true,
      fleetDmLabelId: member.fleetDmLabelId || null,
    }));

    // Perform bulk insert
    await db.member.createMany({
      data,
      skipDuplicates: true, // Prevents error if userId is already a member
    });

    // Fetch the created members for response (by userId, since ids are generated)
    return db.member.findMany({
      where: {
        organizationId,
        userId: { in: memberData.map((m) => m.userId) },
      },
      select: this.MEMBER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }
}
