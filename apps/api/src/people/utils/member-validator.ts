import { NotFoundException, BadRequestException } from '@nestjs/common';
import { db } from '@trycompai/db';

export class MemberValidator {
  /**
   * Validates that an organization exists
   */
  static async validateOrganization(organizationId: string): Promise<void> {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found`,
      );
    }
  }

  /**
   * Validates that a user exists and returns user data
   */
  static async validateUser(
    userId: string,
  ): Promise<{ id: string; name: string; email: string }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Validates that a member exists in an organization
   */
  static async validateMemberExists(
    memberId: string,
    organizationId: string,
  ): Promise<{ id: string; userId: string }> {
    const member = await db.member.findFirst({
      where: {
        id: memberId,
        organizationId,
        deactivated: false,
      },
      select: { id: true, userId: true },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in organization ${organizationId}`,
      );
    }

    return member;
  }

  /**
   * Validates that a user is not already a member of an organization
   */
  static async validateUserNotMember(
    userId: string,
    organizationId: string,
    excludeMemberId?: string,
  ): Promise<void> {
    const whereClause: any = {
      userId,
      organizationId,
      deactivated: false,
    };

    if (excludeMemberId) {
      whereClause.id = { not: excludeMemberId };
    }

    const existingMember = await db.member.findFirst({
      where: whereClause,
    });

    if (existingMember) {
      const user = await this.validateUser(userId);
      throw new BadRequestException(
        `User ${user.email} is already a member of this organization`,
      );
    }
  }
}
