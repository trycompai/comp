import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  schema: './prisma/schema',
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed/seed.ts',
  },
});
