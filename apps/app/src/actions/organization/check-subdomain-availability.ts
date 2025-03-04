// check-subdomain-availability.ts

"use server";

import { db } from "@bubba/db";
import { authActionClient } from "../safe-action";
import { subdomainAvailabilitySchema } from "../schema";
import type { ActionResponse } from "../types";

export const checkSubdomainAvailability = authActionClient
  .schema(subdomainAvailabilitySchema)
  .metadata({
    name: "check-subdomain-availability",
  })
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    const { subdomain } = parsedInput;

    try {
      const subdomainExists = await db.organization.findFirst({
        where: {
          subdomain: {
            equals: subdomain,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      return {
        success: true,
        data: !subdomainExists,
      };
    } catch (error) {
      console.error("Prisma error:", error);
      return {
        success: false,
        error: "Failed to check subdomain availability",
      };
    }
  });
