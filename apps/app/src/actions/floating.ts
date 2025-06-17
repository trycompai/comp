'use server';

import { addYears } from 'date-fns';
import { createSafeActionClient } from 'next-safe-action';
import { cookies } from 'next/headers';
import { z } from 'zod';

const schema = z.object({
  floatingOpen: z.boolean(),
});

export const updateFloatingState = createSafeActionClient()
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();

    cookieStore.set({
      name: 'floating-onboarding-checklist',
      value: JSON.stringify(parsedInput.floatingOpen),
      expires: addYears(new Date(), 1),
    });

    return { success: true };
  });
