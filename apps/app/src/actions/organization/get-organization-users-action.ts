"use server";

import { db } from "@bubba/db";
import { authActionClient } from "../safe-action";

interface User {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

export const getOrganizationUsersAction = authActionClient
  .metadata({
    name: "get-organization-users",
  })
  .action(
    async ({
      parsedInput,
      ctx,
    }): Promise<{ success: boolean; error?: string; data?: User[] }> => {
      if (!ctx.user.organizationId) {
        return {
          success: false,
          error: "User does not have an organization",
        };
      }

      try {
        const users = await db.organizationMember.findMany({
          where: {
            organizationId: ctx.user.organizationId,
          },
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            user: {
              name: "asc",
            },
          },
        });

        return {
          success: true,
          data: users.map((member) => ({
            id: member.user.id,
            name: member.user.name || "",
            image: member.user.image || "",
            role: member.role,
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: "Failed to fetch organization users",
        };
      }
    },
  );
