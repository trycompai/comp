"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import {
  type AppError,
  employeeDetailsInputSchema,
  appErrors,
  EmployeeDetails,
} from "../types";
import { auth } from "@/auth";

// Type-safe action response
export type ActionResponse<T> = Promise<
  { success: true; data: T } | { success: false; error: AppError }
>;

export const getEmployeeDetails = authActionClient
  .schema(employeeDetailsInputSchema)
  .metadata({
    name: "get-employee-details",
    track: {
      event: "get-employee-details",
      channel: "server",
    },
  })
  .action(async ({ parsedInput }) => {
    const { employeeId } = parsedInput;

    const session = await auth();
    const organizationId = session?.user.organizationId;

    if (!organizationId) {
      throw new Error("Organization ID not found");
    }

    try {
      const employee = await db.employee.findUnique({
        where: {
          id: employeeId,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          createdAt: true,
          isActive: true,
          employeeTasks: {
            select: {
              id: true,
              status: true,
              requiredTask: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!employee) {
        return {
          success: false,
          error: appErrors.NOT_FOUND.message,
        };
      }

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      console.error("Error fetching employee details:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
