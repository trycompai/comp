"use server";

import { db } from "@bubba/db";
import type { Departments } from "@bubba/db/types";
import { authActionClient } from "@/actions/safe-action";
import { revalidatePath } from "next/cache";
import {
  type AppError,
  updateEmployeeDepartmentSchema,
  appErrors,
} from "../types";
import { auth } from "@/auth";

export type ActionResponse<T = any> = Promise<
  { success: true; data: T } | { success: false; error: AppError }
>;

export const updateEmployeeDepartment = authActionClient
  .schema(updateEmployeeDepartmentSchema)
  .metadata({
    name: "update-employee-department",
    track: {
      event: "update-employee-department",
      channel: "server",
    },
  })
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    const { employeeId, department } = parsedInput;

    const session = await auth();
    const organizationId = session?.user.organizationId;

    if (!organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    try {
      const employee = await db.employee.findUnique({
        where: {
          id: employeeId,
          organizationId,
        },
      });

      if (!employee) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      const updatedEmployee = await db.employee.update({
        where: {
          id: employeeId,
          organizationId,
        },
        data: {
          department: department as Departments,
        },
      });

      // Revalidate related paths
      revalidatePath(`/${organizationId}/employees/${employeeId}`);
      revalidatePath(`/${organizationId}/employees`);

      return {
        success: true,
        data: updatedEmployee,
      };
    } catch (error) {
      console.error("Error updating employee department:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });
