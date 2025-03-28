"use server";

import { db } from "@bubba/db";
import { authActionClient } from "@/actions/safe-action";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { appErrors } from "../types";

const schema = z.object({
  employeeId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
});

export const updateEmployeeDetails = authActionClient
  .schema(schema)
  .metadata({
    name: "update-employee-details",
    track: {
      event: "update-employee-details",
      channel: "server",
    },
  })
  .action(
    async ({
      parsedInput,
    }): Promise<
      { success: true; data: any } | { success: false; error: any }
    > => {
      const { employeeId, name, email } = parsedInput;

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
            name,
            email,
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
        console.error("Error updating employee details:", error);
        return {
          success: false,
          error: appErrors.UNEXPECTED_ERROR,
        };
      }
    }
  );
