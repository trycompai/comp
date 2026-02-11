'use server';

import { authActionClientWithoutOrg } from '@/actions/safe-action';
import { db } from '@db/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
});

export const searchGlobalVendorsAction = authActionClientWithoutOrg
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
      // If empty search, return popular/all vendors (limited to reasonable amount)
      const whereClause = name.trim()
        ? {
            OR: [
              {
                company_name: {
                  contains: name,
                  mode: 'insensitive' as const,
                },
              },
              { legal_name: { contains: name, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const vendors = await db.globalVendors.findMany({
        where: whereClause,
        take: 50,
        orderBy: { company_name: 'asc' },
      });

      return { success: true, data: { vendors } };
    } catch (error) {
      console.error('Error searching global vendors:', error);
      return { success: false, error: 'Failed to search global vendors' };
    }
  });
