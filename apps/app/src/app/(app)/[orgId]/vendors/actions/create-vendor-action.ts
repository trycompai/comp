'use server';

import type { ActionResponse } from '@/types/actions';
import { auth } from '@/utils/auth';
import { db, type Vendor, VendorCategory, VendorStatus } from '@db';
import { getGT } from 'gt-next/server';
import { createSafeActionClient } from 'next-safe-action';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const createSchema = async () => {
  const t = await getGT();
  return z.object({
    name: z.string().min(1, t('Name is required')),
    website: z.string().url(t('Must be a valid URL')).optional(),
    description: z.string().optional(),
    category: z.nativeEnum(VendorCategory),
    status: z.nativeEnum(VendorStatus).default(VendorStatus.not_assessed),
    assigneeId: z.string().optional(),
  });
};

export const createVendorAction = createSafeActionClient()
  .inputSchema(async () => await createSchema())
  .action(async (input): Promise<ActionResponse<Vendor>> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.session?.activeOrganizationId) {
        const t = await getGT();
        throw new Error(t('Unauthorized'));
      }

      const vendor = await db.vendor.create({
        data: {
          name: input.parsedInput.name,
          description: input.parsedInput.description || '',
          category: input.parsedInput.category,
          status: input.parsedInput.status,
          assigneeId: input.parsedInput.assigneeId,
          organizationId: session.session.activeOrganizationId,
        },
      });

      revalidatePath(`/${session.session.activeOrganizationId}/vendors`);

      return { success: true, data: vendor };
    } catch (error) {
      const t = await getGT();
      return {
        success: false,
        error: error instanceof Error ? error.message : t('Failed to create vendor'),
      };
    }
  });
