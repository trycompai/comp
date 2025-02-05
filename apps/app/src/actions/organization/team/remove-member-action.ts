// remove-member-action.ts

"use server";

import { getI18n } from "@/locales/server";
import { Role, db } from "@bubba/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { authActionClient } from "../../safe-action";
import { removeMemberSchema } from "../../schema";

export const removeMemberAction = authActionClient
  .schema(removeMemberSchema)
  .metadata({
    name: "remove-member",
    track: {
      event: "remove-member",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const t = await getI18n();

    try {
      const { userId, organizationId } = parsedInput;

      // Check if current user is admin
      const currentUserRole = await db.organizationMember.findFirst({
        where: {
          userId: ctx.user.id,
          organizationId,
        },
      });

      if (!currentUserRole || currentUserRole.role !== Role.admin) {
        throw new Error(t("settings.members.remove_member_error"));
      }

      const totalMembers = await db.organizationMember.count({
        where: {
          organizationId,
        },
      });

      if (userId === ctx.user.id && totalMembers === 1) {
        throw new Error(t("settings.members.last_member_error"));
      }

      await db.organizationMember.delete({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });

      revalidateTag("organization-members");
      revalidatePath("/settings/members");

      return {
        success: true,
      };
    } catch (error) {
      throw new Error(t("settings.members.remove_member_error"));
    }
  });

