import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Derive pg SSL config from the DATABASE_URL sslmode parameter.
 * See apps/api/prisma/client.ts for detailed documentation.
 */
function getSslConfig(url: string): boolean | { rejectUnauthorized: boolean } | undefined {
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
  const ssl = getSslConfig(url);
  const cleanUrl = url.replace(/[?&]sslmode=\w[\w-]*/g, '').replace(/\?&/, '?').replace(/\?$/, '');
  const adapter = new PrismaPg({ connectionString: cleanUrl, ssl });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
