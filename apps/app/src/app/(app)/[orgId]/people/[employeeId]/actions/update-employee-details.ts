'use server';

import { authActionClient } from '@/actions/safe-action';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { appErrors } from '../types';

const schema = z.object({
  employeeId: z.string(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

export const updateEmployeeDetails = authActionClient
  .inputSchema(schema)
  .metadata({
    name: 'update-employee-details',
    track: {
      event: 'update-employee-details',
      channel: 'server',
    },
  })
  .action(
    async ({
      parsedInput,
    }): Promise<{ success: true; data: any } | { success: false; error: any }> => {
      const { employeeId, name, email } = parsedInput;

      const session = await auth.api.getSession({
        headers: await headers(),
      });

      const organizationId = session?.session.activeOrganizationId;

      if (!organizationId) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      try {
        const employee = await db.member.findUnique({
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

        const updatedEmployee = await db.member.update({
          where: {
            id: employeeId,
            organizationId,
          },
          data: {
            user: {
              update: {
                name,
                email,
              },
            },
          },
        });

        // Revalidate related paths
        revalidatePath(`/${organizationId}/people/${employeeId}`);
        revalidatePath(`/${organizationId}/people`);

        return {
          success: true,
          data: updatedEmployee,
        };
      } catch (error) {
        console.error('Error updating employee details:', error);
        return {
          success: false,
          error: appErrors.UNEXPECTED_ERROR,
        };
      }
    },
  );
