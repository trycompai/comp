import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed/seed.ts",
  },
});
