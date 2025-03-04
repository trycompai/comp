"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { MembershipRole } from "@prisma/client";
import { z } from "zod";

export const assignEvidence = authActionClient
  .schema(
    z.object({
      id: z.string(),
      assigneeId: z.string().nullable(),
    }),
  )
  .metadata({
    name: "assignEvidence",
    track: {
      event: "assign-evidence",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { id, assigneeId } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Verify the evidence exists and belongs to the organization
      const evidence = await db.organizationEvidence.findFirst({
        where: {
          id,
          organizationId: user.organizationId,
        },
      });

      if (!evidence) {
        return {
          success: false,
          error: "Evidence not found",
        };
      }

      // If assigneeId is provided, verify the user exists and has admin privileges
      if (assigneeId) {
        const adminMember = await db.organizationMember.findFirst({
          where: {
            userId: assigneeId,
            organizationId: user.organizationId,
            role: {
              in: [MembershipRole.admin, MembershipRole.owner],
            },
          },
        });

        if (!adminMember) {
          return {
            success: false,
            error: "User not found or does not have admin privileges",
          };
        }
      }

      // Update the evidence with the new assignee
      const updatedEvidence = await db.organizationEvidence.update({
        where: {
          id,
        },
        data: {
          assigneeId,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        data: updatedEvidence,
      };
    } catch (error) {
      console.error("Error assigning evidence:", error);
      return {
        success: false,
        error: "Failed to assign evidence",
      };
    }
  });
