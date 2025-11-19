import path from 'node:path';
import type { PrismaConfig } from 'prisma';

export default {
  schema: path.join('prisma', 'schema'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed/seed.ts',
  },
} satisfies PrismaConfig;
