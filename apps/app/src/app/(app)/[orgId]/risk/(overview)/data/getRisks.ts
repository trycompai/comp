import 'server-only';

import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { Prisma, type User } from '@comp/db/types';
import { headers } from 'next/headers';
import type { GetRiskSchema } from './validations';

export async function getRisks(input: GetRiskSchema): Promise<{
  data: (Omit<
    Prisma.RiskGetPayload<{
      include: { assignee: { include: { user: true } } };
    }>,
    'assignee'
  > & { assignee: User | null })[];
  pageCount: number;
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    // In case of unauthorized or missing org, return empty data and 0 pageCount
    return { data: [], pageCount: 0 };
  }

  const { title, page, perPage, sort, filters, joinOperator } = input;

  const orderBy = sort.map((s) => ({
    [s.id]: s.desc ? 'desc' : 'asc',
  }));

  const filterConditions: Prisma.RiskWhereInput[] = filters.map((filter) => {
    // Basic handling, assuming 'eq' or 'in' based on value type for now
    // This might need to be more sophisticated based on actual filter operators
    const value = Array.isArray(filter.value) ? { in: filter.value } : filter.value;
    return { [filter.id]: value };
  });

  const where: Prisma.RiskWhereInput = {
    organizationId: session.session.activeOrganizationId,
    ...(title && {
      title: {
        contains: title,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
    ...(filterConditions.length > 0 && {
      [joinOperator.toUpperCase()]: filterConditions,
    }),
  };

  const skip = (page - 1) * perPage;
  const take = perPage;

  const risksData = await db.risk.findMany({
    where,
    skip,
    take,
    include: {
      assignee: {
        include: {
          user: true,
        },
      },
    },
    orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
  });

  const totalRisks = await db.risk.count({ where });

  const pageCount = Math.ceil(totalRisks / perPage);

  // Transform the data to match the expected structure (assignee as User | null)
  const transformedRisks = risksData.map((risk) => ({
    ...risk,
    assignee: risk.assignee ? risk.assignee.user : null,
  }));

  return {
    data: transformedRisks,
    pageCount,
  };
}
