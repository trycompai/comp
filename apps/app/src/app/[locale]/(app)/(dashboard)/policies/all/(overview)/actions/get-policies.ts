"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { appErrors, policiesInputSchema } from "../types";
import { unstable_cache } from "next/cache";

// Cache key generator function for consistent cache keys
function generatePoliciesCacheKey(
  organizationId: string,
  search?: string,
  status?: string,
  page = 1,
  per_page = 10,
  sort?: string,
) {
  return `policies-${organizationId}-${search || ""}-${status || ""}-${page}-${per_page}-${sort || ""}`;
}

// Cached function to fetch policies
const getCachedPolicies = unstable_cache(
  async ({
    organizationId,
    search,
    status,
    page = 1,
    per_page = 10,
    sort,
  }: {
    organizationId: string;
    search?: string;
    status?: string;
    page?: number;
    per_page?: number;
    sort?: string;
  }) => {
    const skip = (page - 1) * per_page;
    const [column, order] = sort?.split(":") ?? [];

    let orderByClause: any = { updatedAt: "desc" };

    if (column) {
      if (column === "name") {
        orderByClause = {
          policy: {
            name: order === "asc" ? "asc" : "desc",
          },
        };
      } else {
        orderByClause = {
          [column]: order === "asc" ? "asc" : "desc",
        };
      }
    }

    const [policies, total] = await Promise.all([
      db.organizationPolicy.findMany({
        where: {
          organizationId,
          AND: [
            search
              ? {
                  policy: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      {
                        description: { contains: search, mode: "insensitive" },
                      },
                    ],
                  },
                }
              : {},
            status ? { status: status as any } : {},
          ],
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          policy: {
            select: {
              id: true,
              name: true,
              description: true,
              slug: true,
            },
          },
        },
        skip,
        take: per_page,
        orderBy: orderByClause,
      }),
      db.organizationPolicy.count({
        where: {
          organizationId,
          AND: [
            search
              ? {
                  policy: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      {
                        description: { contains: search, mode: "insensitive" },
                      },
                    ],
                  },
                }
              : {},
            status ? { status: status as any } : {},
          ],
        },
      }),
    ]);

    return { policies, total };
  },
  ["policies"],
  {
    tags: ["policies"],
  },
);

export const getPolicies = authActionClient
  .schema(policiesInputSchema)
  .metadata({
    name: "get-policies",
    track: {
      event: "get-policies",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { search, status, page = 1, per_page = 10, sort } = parsedInput;
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED.message,
      };
    }

    try {
      const { policies, total } = await getCachedPolicies({
        organizationId: user.organizationId,
        search,
        status,
        page,
        per_page,
        sort,
      });

      return {
        success: true,
        data: { policies, total },
      };
    } catch (error) {
      console.error("Error fetching policies:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
