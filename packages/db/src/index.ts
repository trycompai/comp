import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../prisma/generated/client";

export * from "../prisma/generated/browser";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const db = new PrismaClient({ adapter });

export { db, Prisma };
