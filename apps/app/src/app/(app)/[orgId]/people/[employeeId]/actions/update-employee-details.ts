'use server';

import { authActionClient } from '@/actions/safe-action';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { getGT } from 'gt-next/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getAppErrors } from '../types';

const getSchema = (t: Awaited<ReturnType<typeof getGT>>) =>
  z.object({
    employeeId: z.string(),
    name: z.string().min(1, t('Name is required')),
    email: z.string().email(t('Invalid email address')),
  });

export const updateEmployeeDetails = authActionClient
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
      ctx,
    }): Promise<{ success: true; data: any } | { success: false; error: any }> => {
      const t = await getGT();
      const schema = getSchema(t);
      const appErrors = getAppErrors(t);

      const parseResult = schema.safeParse(parsedInput);
      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error.errors[0]?.message || t('Invalid input'),
        };
      }

      const { employeeId, name, email } = parseResult.data;

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
