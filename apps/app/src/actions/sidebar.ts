'use server';

import { addYears } from 'date-fns';
import { createSafeActionClient } from 'next-safe-action';
import { cookies } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  isCollapsed: z.boolean(),
});

export const updateSidebarState = createSafeActionClient()
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();

    cookieStore.set({
      name: 'sidebar-collapsed',
      value: JSON.stringify(parsedInput.isCollapsed),
      expires: addYears(new Date(), 1),
    });

    return { success: true };
  });
