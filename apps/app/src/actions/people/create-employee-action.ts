'use server';

import { completeEmployeeCreation } from '@/lib/db/employee';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { authActionClient } from '../safe-action';
import { createEmployeeSchema } from '../schema';
import type { ActionResponse } from '../types';

export const createEmployeeAction = authActionClient
  .inputSchema(createEmployeeSchema)
  .metadata({
    name: 'create-employee',
    track: {
      event: 'create-employee',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }): Promise<ActionResponse> => {
    const { name, email, department, externalEmployeeId } = parsedInput;
    const { user, session } = ctx;

    if (!session.activeOrganizationId) {
      return {
        success: false,
        error: 'Not authorized - no organization found',
      };
    }

    try {
      const employee = await completeEmployeeCreation({
        name,
        email,
        department,
        organizationId: session.activeOrganizationId,
        externalEmployeeId,
      });

      return {
        success: true,
        data: employee,
      };
    } catch (error) {
      console.error('Error creating employee:', error);

      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        return {
          success: false,
          error: 'An employee with this email already exists in your organization',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create employee',
      };
    }
  });
