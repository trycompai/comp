"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { employeesInputSchema, appErrors } from "../types";

export const getEmployees = authActionClient
  .schema(employeesInputSchema)
  .metadata({
    name: "get-employees",
    track: {
      event: "get-employees",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { search, role, page = 1, per_page = 10 } = parsedInput;
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED.message,
      };
    }

    try {
      const skip = (page - 1) * per_page;

      const [employees, total] = await Promise.all([
        db.employee.findMany({
          where: {
            organizationId: user.organizationId,
            AND: [
              search
                ? {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                    ],
                  }
                : {},
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
          skip,
          take: per_page,
        }),
        db.employee.count({
          where: {
            organizationId: user.organizationId,
            AND: [
              search
                ? {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                    ],
                  }
                : {},
            ],
          },
        }),
      ]);

      return {
        success: true,
        data: { employees, total },
      };
    } catch (error) {
      console.error("Error fetching employees:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
