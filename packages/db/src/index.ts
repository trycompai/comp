import { PrismaClient } from '../prisma/generated/client';
export * from '../prisma/generated/models';

const db = new PrismaClient();

export default db;
