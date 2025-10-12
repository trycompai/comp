import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'ts-node prisma/seed/seed.ts',
  },
});
