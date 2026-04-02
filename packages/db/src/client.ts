import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Derive pg SSL config from the DATABASE_URL sslmode parameter.
 * See apps/api/prisma/client.ts for detailed documentation.
 */
function getSslConfig(url: string): PoolConfig['ssl'] {
  const match = url.match(/sslmode=(\w[\w-]*)/);
  if (!match) return undefined;
  const mode = match[1];
  switch (mode) {
    case 'disable': return undefined;
    case 'require': case 'no-verify': return { rejectUnauthorized: false };
    case 'verify-ca': case 'verify-full': return { rejectUnauthorized: true };
    default: return undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString: url, ssl: getSslConfig(url) });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
