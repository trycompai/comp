import { getDb } from '@trycompai/db';

export * from '@trycompai/db/types';


export const db = getDb({ connectionString: process.env.DATABASE_URL! });

export default db;
