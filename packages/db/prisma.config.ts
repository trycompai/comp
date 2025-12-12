import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma'),
  migrate: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'ts-node prisma/seed/seed.ts',
  },
});
