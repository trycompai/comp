'use server';

import { addYears } from 'date-fns';
import { createSafeActionClient } from 'next-safe-action';
import { cookies } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  view: z.enum(['categories', 'list']),
  orgId: z.string(),
});

export const updateTaskViewPreference = createSafeActionClient()
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();

    cookieStore.set({
      name: `task-view-preference-${parsedInput.orgId}`,
      value: parsedInput.view,
      expires: addYears(new Date(), 1),
    });

    return { success: true };
  });

