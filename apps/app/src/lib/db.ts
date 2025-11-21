import { getDb, Prisma } from '@trycompai/db';

export * from '@trycompai/db/types';
export { Prisma };

export const db = getDb({ connectionString: process.env.DATABASE_URL! });

export default db;
