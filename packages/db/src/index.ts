import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../prisma/generated/client";

export * from "../prisma/generated/browser";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const adapter = new PrismaPg({
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  connectionString: process.env.DATABASE_URL,
});

const db =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

// eslint-disable-next-line turbo/no-undeclared-env-vars
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default { db, Prisma };
