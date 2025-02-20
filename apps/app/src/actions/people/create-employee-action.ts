"use server";

import { type Employee, db } from "@bubba/db";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { authActionClient } from "../safe-action";
import { createEmployeeSchema } from "../schema";
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

export const createEmployeeAction = authActionClient
  .schema(createEmployeeSchema)
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
      // First check if an employee exists (active or inactive)
      const existingEmployee = await db.employee.findUnique({
        where: {
          email_organizationId: {
            email,
            organizationId: user.organizationId,
          },
        },
      });

      let employee: Employee;

      if (existingEmployee) {
        if (existingEmployee.isActive) {
          return {
            success: false,
            error:
              "An employee with this email already exists in your organization",
          };
        }

        // Reactivate the existing employee
        employee = await db.employee.update({
          where: { id: existingEmployee.id },
          data: {
            name,
            department,
            isActive: true,
            externalEmployeeId,
            organizationId: user.organizationId,
            updatedAt: new Date(),
          },
        });
      } else {
        employee = await db.employee.create({
          data: {
            name,
            email,
            department,
            organizationId: user.organizationId,
            isActive: true,
            externalEmployeeId,
          },
        });
      }

      // Update or create portalUser
      const portalUser = await db.portalUser.upsert({
        where: { email },
        create: {
          id: employee.id,
          name,
          email,
          organizationId: user.organizationId,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          employees: {
            connect: {
              id: employee.id,
            },
          },
        },
        update: {
          updatedAt: new Date(),
          name,
          email,
          organizationId: user.organizationId,
          employees: {
            connect: {
              id: employee.id,
            },
          },
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
        }),
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
        }),
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
