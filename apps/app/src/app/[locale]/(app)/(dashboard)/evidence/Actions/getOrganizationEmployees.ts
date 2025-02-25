"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { MembershipRole } from "@prisma/client";

export const getOrganizationAdmins = authActionClient
  .metadata({
    name: "getOrganizationAdmins",
    track: {
      event: "get-organization-admins",
      channel: "server",
    },
  })
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Find organization members with admin or owner roles
      const adminMembers = await db.organizationMember.findMany({
        where: {
          organizationId: user.organizationId,
          role: {
            in: [MembershipRole.admin, MembershipRole.owner],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      });

      // Transform the data to a simpler format
      const admins = adminMembers.map((member) => ({
        id: member.userId,
        name: member.user.name || "Unknown",
        email: member.user.email || "",
        role: member.role,
      }));

      return {
        success: true,
        data: admins,
      };
    } catch (error) {
      console.error("Error fetching organization admins:", error);
      return {
        success: false,
        error: "Failed to fetch organization admins",
      };
    }
  });
