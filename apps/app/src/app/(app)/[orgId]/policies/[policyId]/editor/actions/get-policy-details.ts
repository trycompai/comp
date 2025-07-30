'use server';

import { authActionClient } from '@/actions/safe-action';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { appErrors, policyDetailsInputSchema } from '../types';

export const getPolicyDetails = authActionClient
  .inputSchema(policyDetailsInputSchema)
  .metadata({
    name: 'get-policy-details',
    track: {
      event: 'get-policy-details',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput }) => {
    const { policyId } = parsedInput;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const organizationId = session?.session.activeOrganizationId;

    if (!organizationId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED.message,
      };
    }

    try {
      const policy = await db.policy.findUnique({
        where: {
          id: policyId,
          organizationId,
        },
      });

      if (!policy) {
        return {
          success: false,
          error: appErrors.NOT_FOUND.message,
        };
      }

      return {
        success: true,
        data: policy,
      };
    } catch (error) {
      console.error('Error fetching policy details:', error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR.message,
      };
    }
  });
