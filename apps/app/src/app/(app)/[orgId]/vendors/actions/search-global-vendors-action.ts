'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { getGT } from 'gt-next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});

export const searchGlobalVendorsAction = authActionClient
  .inputSchema(schema)
  .metadata({
    name: 'search-global-vendors',
    track: {
      event: 'search-global-vendors',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput }) => {
    const { name } = parsedInput;

    try {
      const vendors = await db.globalVendors.findMany({
        where: {
          OR: [
            {
              company_name: {
                contains: name,
                mode: 'insensitive',
              },
            },
            { legal_name: { contains: name, mode: 'insensitive' } },
          ],
        },
        take: 5,
      });

      return { success: true, data: { vendors } };
    } catch (error) {
      console.error('Error searching global vendors:', error);
      const t = await getGT();
      return { success: false, error: t('Failed to search global vendors') };
    }
  });
