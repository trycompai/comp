'use server';

import { authActionClient } from '@/actions/safe-action';
import type { Departments } from '@db';
import { db, Prisma } from '@db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { appErrors } from '../types';

const schema = z.object({
  employeeId: z.string(),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  email: z.string().email('Invalid email format').optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.date().optional(),
});

export const updateEmployee = authActionClient
  .inputSchema(schema)
  .metadata({
    name: 'update-employee',
    track: {
      event: 'update-employee',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { employeeId, name, email, department, isActive, createdAt } = parsedInput;

    const organizationId = ctx.session.activeOrganizationId;
    if (!organizationId) {
      return {
        success: false,
        error: {
          code: appErrors.UNAUTHORIZED,
          message: appErrors.UNAUTHORIZED.message,
        },
      };
    }

    const currentUserMember = await db.member.findFirst({
      where: {
        organizationId: organizationId,
        userId: ctx.user.id,
      },
    });

    if (
      !currentUserMember ||
      (!currentUserMember.role.includes('admin') && !currentUserMember.role.includes('owner'))
    ) {
      return {
        success: false,
        error: {
          code: appErrors.UNAUTHORIZED,
          message: "You don't have permission to update members.",
        },
      };
    }

    const member = await db.member.findUnique({
      where: {
        id: employeeId,
        organizationId,
      },
      include: { user: true },
    });

    if (!member || !member.user) {
      return {
        success: false,
        error: {
          code: appErrors.NOT_FOUND,
          message: appErrors.NOT_FOUND.message,
        },
      };
    }

    const memberUpdateData: {
      department?: Departments;
      isActive?: boolean;
      createdAt?: Date;
    } = {};
    const userUpdateData: { name?: string; email?: string } = {};

    if (department !== undefined && department !== member.department) {
      memberUpdateData.department = department as Departments;
    }
    if (isActive !== undefined && isActive !== member.isActive) {
      memberUpdateData.isActive = isActive;
    }
    if (createdAt !== undefined && createdAt.toISOString() !== member.createdAt.toISOString()) {
      memberUpdateData.createdAt = createdAt;
    }
    if (name !== undefined && name !== member.user.name) {
      userUpdateData.name = name;
    }
    if (email !== undefined && email !== member.user.email) {
      userUpdateData.email = email;
    }

    const hasMemberChanges = Object.keys(memberUpdateData).length > 0;
    const hasUserChanges = Object.keys(userUpdateData).length > 0;

    if (!hasMemberChanges && !hasUserChanges) {
      return { success: true, data: member };
    }

    try {
      let updatedMemberResult = member;

      await db.$transaction(async (tx) => {
        if (hasUserChanges) {
          await tx.user.update({
            where: { id: member.userId },
            data: userUpdateData,
          });
        }

        if (hasMemberChanges) {
          updatedMemberResult = await tx.member.update({
            where: {
              id: employeeId,
              organizationId,
            },
            data: memberUpdateData,
            include: { user: true },
          });
        } else if (hasUserChanges) {
          updatedMemberResult = await tx.member.findUniqueOrThrow({
            where: { id: member.id },
            include: { user: true },
          });
        }
      });

      revalidatePath(`/${organizationId}/people/${employeeId}`);
      revalidatePath(`/${organizationId}/people`);

      return { success: true, data: updatedMemberResult };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const targetFields = error.meta?.target as string[] | undefined;
          if (targetFields?.includes('email')) {
            return {
              success: false,
              error: {
                code: appErrors.UNEXPECTED_ERROR,
                message: 'Email address is already in use.',
              },
            };
          }
        }
      }
      throw error;
    }
  });
