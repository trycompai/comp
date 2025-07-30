import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { cache } from 'react';
import 'server-only';

export const getContextEntries = cache(
  async ({
    orgId,
    search,
    page,
    perPage,
  }: {
    orgId: string;
    search?: string;
    page: number;
    perPage: number;
  }): Promise<{
    data: any[];
    pageCount: number;
  }> => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.session.activeOrganizationId || session.session.activeOrganizationId !== orgId) {
      return { data: [], pageCount: 0 };
    }
    const where: any = {
      organizationId: orgId,
      ...(search && {
        question: {
          contains: search,
          mode: 'insensitive',
        },
      }),
    };
    const skip = (page - 1) * perPage;
    const take = perPage;
    const entries = await db.context.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    const total = await db.context.count({ where });
    const pageCount = Math.ceil(total / perPage);
    return { data: entries, pageCount };
  },
);
