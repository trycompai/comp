import 'server-only';

import { auth } from '@/utils/auth';
import { db, Prisma } from '@db';
import { headers } from 'next/headers';
// import { cache } from "react"; // Already handled: ensure it stays removed or remove if re-introduced
import type { GetControlSchema } from './validations';

const controlInclude = {
  policies: {
    select: {
      status: true,
      id: true,
      name: true,
    },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
    },
  },
  requirementsMapped: {
    include: {
      frameworkInstance: {
        include: {
          framework: true,
        },
      },
      requirement: {
        select: {
          name: true,
          identifier: true,
        },
      },
    },
  },
} satisfies Prisma.ControlInclude;

export type ControlWithRelations = Prisma.ControlGetPayload<{
  include: typeof controlInclude;
}>;

export async function getControls(
  input: GetControlSchema,
): Promise<{ data: ControlWithRelations[]; pageCount: number }> {
  // cache wrapper already handled: ensure it stays removed or remove if re-introduced
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const organizationId = session?.session.activeOrganizationId;

    if (!organizationId) {
      throw new Error('Organization not found');
    }

    const orderBy = input.sort.map((sort) => ({
      [sort.id]: sort.desc ? 'desc' : 'asc',
    }));

    const where: Prisma.ControlWhereInput = {
      organizationId,
      ...(input.name && {
        name: {
          contains: input.name,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
      ...(input.lastUpdated.length > 0 && {
        lastUpdated: {
          in: input.lastUpdated,
        },
      }),
    };

    const controls = await db.control.findMany({
      where,
      orderBy: orderBy.length > 0 ? orderBy : [{ name: 'asc' }],
      skip: (input.page - 1) * input.perPage,
      take: input.perPage,
      include: controlInclude,
    });

    const total = await db.control.count({
      where,
    });

    const pageCount = Math.ceil(total / input.perPage);
    return { data: controls, pageCount };
  } catch (_err) {
    return { data: [], pageCount: 0 };
  }
}
