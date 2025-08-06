'use server';

import { Cookies } from '@/utils/constants';
import { addYears } from 'date-fns';
import { cookies } from 'next/headers';
import { authActionClient } from './safe-action';
import { getUpdaterMenuSchema } from './schema';
import { getGT } from 'gt-next/server';

export const updateMenuAction = authActionClient
  .inputSchema(async () => {
    const t = await getGT();
    return getUpdaterMenuSchema(t);
  })
  .metadata({
    name: 'update-menu',
  })
  .action(async ({ parsedInput: value }) => {
    const cookieStore = await cookies();

    cookieStore.set({
      name: Cookies.MenuConfig,
      value: JSON.stringify(value),
      expires: addYears(new Date(), 1),
    });

    return value;
  });
