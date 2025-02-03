// change-user-role-action.ts

"use server";

import { Role, db } from "@bubba/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { authActionClient } from "../../safe-action";
import { changeUserRoleSchema } from "../../schema";

export const changeUserRoleAction = authActionClient
  .schema(changeUserRoleSchema)
  .metadata({
    name: "change-user-role",
    track: {
      event: "change-user-role",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { userId, organizationId, role } = parsedInput;

    const currentUserRole = await db.organizationMember.findFirst({
      where: {
        userId: ctx.user.id,
        organizationId,
      },
    });

    if (!currentUserRole || currentUserRole.role !== Role.admin) {
      throw new Error("You are not authorized to change user roles");
    }

    if (role !== Role.admin) {
      const adminCount = await db.organizationMember.count({
        where: {
          organizationId,
          role: Role.admin,
        },
      });

      const isTargetUserAdmin = await db.organizationMember.findFirst({
        where: {
          userId,
          organizationId,
          role: Role.admin,
        },
      });

      if (adminCount === 1 && isTargetUserAdmin) {
        throw new Error("Cannot change role - organization must have at least one admin");
      }
    }

    await db.organizationMember.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: {
        role,
      },
    });

    revalidateTag("organization-members");
    revalidatePath("/settings/members");

    return {
      success: true,
    };
  });
