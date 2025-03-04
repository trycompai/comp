"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import type {
  Framework,
  OrganizationControl,
  OrganizationFramework,
  OrganizationCategory,
  Control,
  OrganizationControlRequirement,
  OrganizationPolicy,
} from "@bubba/db";
import { z } from "zod";

export type OrganizationCategoryWithControls = OrganizationCategory & {
  organizationControl: (OrganizationControl & {
    control: Control;
    OrganizationControlRequirement: (OrganizationControlRequirement & {
      organizationPolicy: Pick<OrganizationPolicy, "status"> | null;
    })[];
  })[];
};

export interface OrganizationCategoriesResponse {
  organizationCategories: OrganizationCategoryWithControls[];
}

export const getOrganizationCategories = authActionClient
  .schema(z.object({ frameworkId: z.string() }))
  .metadata({
    name: "getOrganizationCategories",
    track: {
      event: "get-organization-categories",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { frameworkId } = parsedInput;

    if (!user.organizationId) {
      return {
        error: "Not authorized - no organization found",
      };
    }

    try {
      const organizationCategories = await db.organizationCategory.findMany({
        where: {
          organizationId: user.organizationId,
          frameworkId,
        },
        include: {
          organizationControl: {
            include: {
              control: true,
              OrganizationControlRequirement: {
                include: {
                  organizationPolicy: {
                    select: {
                      status: true,
                    },
                  },
                  organizationEvidence: {
                    select: {
                      published: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!organizationCategories) {
        return {
          error: "Organization categories not found",
        };
      }

      return {
        data: organizationCategories,
      };
    } catch (error) {
      console.error("Error fetching organization categories:", error);
      return {
        error: "Failed to fetch organization categories",
      };
    }
  });
