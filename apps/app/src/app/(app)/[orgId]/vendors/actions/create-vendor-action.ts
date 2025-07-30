'use server';

import type { ActionResponse } from '@/types/actions';
import { auth } from '@/utils/auth';
import { db, type Vendor, VendorCategory, VendorStatus } from '@db';
import { createSafeActionClient } from 'next-safe-action';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Must be a valid URL').optional(),
  description: z.string().optional(),
  category: z.nativeEnum(VendorCategory),
  status: z.nativeEnum(VendorStatus).default(VendorStatus.not_assessed),
  assigneeId: z.string().optional(),
});

export const createVendorAction = createSafeActionClient()
  .inputSchema(schema)
  .action(async (input): Promise<ActionResponse<Vendor>> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.session?.activeOrganizationId) {
        throw new Error('Unauthorized');
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create vendor',
      };
    }
  });
