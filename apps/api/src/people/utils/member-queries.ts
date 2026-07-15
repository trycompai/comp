import { db } from '@db';
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
    jobTitle: true,
    isActive: true,
    deactivated: true,
    backgroundCheckExempt: true,
    backgroundCheckExemptReason: true,
    backgroundCheckExemptJustification: true,
    onboardDate: true,
    offboardDate: true,
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
        role: true,
      },
    },
    backgroundCheckRequests: {
      select: {
        id: true,
        status: true,
        requesterNotes: true,
      },
      take: 1,
      orderBy: { createdAt: 'desc' },
    },
  } as const;

  /**
   * Get all members for an organization
   */
  static async findAllByOrganization(
    organizationId: string,
    includeDeactivated = false,
    filters?: {
      onboardAfter?: Date;
      onboardBefore?: Date;
      offboardAfter?: Date;
      offboardBefore?: Date;
    },
  ): Promise<PeopleResponseDto[]> {
    return db.member.findMany({
      where: {
        organizationId,
        ...(includeDeactivated ? {} : { deactivated: false, isActive: true }),
        ...(filters?.onboardAfter || filters?.onboardBefore
          ? {
              onboardDate: {
                ...(filters.onboardAfter ? { gte: filters.onboardAfter } : {}),
                ...(filters.onboardBefore ? { lte: filters.onboardBefore } : {}),
              },
            }
          : {}),
        ...(filters?.offboardAfter || filters?.offboardBefore
          ? {
              offboardDate: {
                ...(filters.offboardAfter ? { gte: filters.offboardAfter } : {}),
                ...(filters.offboardBefore ? { lte: filters.offboardBefore } : {}),
              },
            }
          : {}),
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
    options?: { includeDeactivated?: boolean },
  ): Promise<PeopleResponseDto | null> {
    return db.member.findFirst({
      where: {
        id: memberId,
        organizationId,
        ...(options?.includeDeactivated ? {} : { deactivated: false }),
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
        jobTitle: createData.jobTitle || null,
      },
      select: this.MEMBER_SELECT,
    });
  }

  /**
   * Update a member by ID within an organization
   */
  static async updateMember(
    memberId: string,
    organizationId: string,
    updateData: UpdatePeopleDto,
  ): Promise<PeopleResponseDto> {
    // Separate user-level fields from member-level fields
    const { name, email, createdAt, onboardDate, offboardDate, ...memberFields } = updateData;

    // Prepare member update data
    const updatePayload: any = { ...memberFields };

    // Convert createdAt string to Date for Prisma
    if (createdAt !== undefined) {
      updatePayload.createdAt = new Date(createdAt);
    }

    if (onboardDate !== undefined) {
      updatePayload.onboardDate = onboardDate ? new Date(onboardDate) : null;
    }
    if (offboardDate !== undefined) {
      updatePayload.offboardDate = offboardDate ? new Date(offboardDate) : null;
    }

    // Handle fleetDmLabelId: convert undefined to null for database
    if (
      memberFields.fleetDmLabelId === undefined &&
      'fleetDmLabelId' in memberFields
    ) {
      updatePayload.fleetDmLabelId = null;
    }

    // Un-exempting clears reason + justification so a future re-exemption
    // starts from a clean state. The audit log retains the prior values
    // from the original exempt-true request.
    if (updatePayload.backgroundCheckExempt === false) {
      updatePayload.backgroundCheckExemptReason = null;
      updatePayload.backgroundCheckExemptJustification = null;
    }

    // Reactivation: the status dropdown sends { isActive: true } via PATCH. A
    // member deactivated via offboarding (or the skip-offboarding path) carries
    // deactivated:true, which hides them from the people list. Clear it so
    // isActive and deactivated stay in sync and the member is fully restored.
    if (updatePayload.isActive === true) {
      updatePayload.deactivated = false;
    }

    const hasUserUpdates = name !== undefined || email !== undefined;
    const hasMemberUpdates = Object.keys(updatePayload).length > 0;

    // If we need to update both user and member, use a transaction
    if (hasUserUpdates) {
      return db.$transaction(async (tx) => {
        // Get the member to find the associated userId (scoped to org)
        const member = await tx.member.findFirstOrThrow({
          where: { id: memberId, organizationId },
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
            where: { id: memberId, organizationId },
            data: updatePayload,
            select: this.MEMBER_SELECT,
          });
        }

        // Return updated member with fresh user data
        return tx.member.findFirstOrThrow({
          where: { id: memberId, organizationId },
          select: this.MEMBER_SELECT,
        });
      });
    }

    // Only member-level updates
    return db.member.update({
      where: { id: memberId, organizationId },
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
   * Delete a member by ID within an organization
   */
  static async deleteMember(
    memberId: string,
    organizationId: string,
  ): Promise<void> {
    await db.member.delete({
      where: { id: memberId, organizationId },
    });
  }

  /**
   * Unlink device by resetting fleetDmLabelId to null within an organization
   */
  static async unlinkDevice(
    memberId: string,
    organizationId: string,
  ): Promise<PeopleResponseDto> {
    return db.member.update({
      where: { id: memberId, organizationId },
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
      jobTitle: member.jobTitle || null,
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
