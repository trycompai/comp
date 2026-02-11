import type { Prisma } from '@db';

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
