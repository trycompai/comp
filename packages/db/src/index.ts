import { PrismaClient } from '../prisma/generated/client';
export * from '../prisma/generated/browser';

const db = new PrismaClient();

export { db };
