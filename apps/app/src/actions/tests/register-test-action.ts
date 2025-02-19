"use server";

import { db } from "@bubba/db";
import { authActionClient } from "../safe-action";
import { registerTestSchema } from "../schema";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { ActionResponse } from "../types";

const DEFAULT_TASKS = [
  {
    code: "POLICY-ACCEPT",
    name: "Policy Acceptance",
    description: "Review and accept company policies",
  },
  {
    code: "INSTALL-AGENT",
    name: "Install Monitoring Agent",
    description:
      "Install and configure the security monitoring agent on your device",
  },
  {
    code: "DEVICE-SECURITY",
    name: "Device Security",
    description: "Complete device security checklist and configuration",
  },
] as const;

export const createTestAction = authActionClient
  .schema(registerTestSchema)
  .metadata({
    name: "create-employee",
    track: {
      event: "create-employee",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse> => {
    const { name, email, department, externalEmployeeId } = parsedInput;
    const { user } = ctx;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      };
    }

    try {
      // Create the employee
      const employee = await db.employee.create({
        data: {
          name,
          email,
          department,
          organizationId: user.organizationId,
          isActive: true,
          externalEmployeeId,
        },
      });

      // Create or get the required task definitions first and store their IDs
      const requiredTasks = await Promise.all(
        DEFAULT_TASKS.map(async (task) => {
          return db.employeeRequiredTask.upsert({
            where: { code: task.code },
            create: {
              code: task.code,
              name: task.name,
              description: task.description,
            },
            update: {},
          });
        })
      );

      // Now create the employee tasks using the actual task IDs
      await Promise.all(
        requiredTasks.map(async (task) => {
          return db.employeeTask.create({
            data: {
              employeeId: employee.id,
              requiredTaskId: task.id,
              status: "assigned",
            },
          });
        })
      );

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      console.error("Error creating employee:", error);

      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return {
          success: false,
          error:
            "An employee with this email already exists in your organization",
        };
      }

      return {
        success: false,
        error: "Failed to create employee",
      };
    }
  });
