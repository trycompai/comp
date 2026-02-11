import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join('dist', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'bun prisma/seed/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
