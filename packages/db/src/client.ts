import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getSslConfig(url: string): boolean | { rejectUnauthorized: boolean } | undefined {
  const sslmodeMatch = url.match(/sslmode=(\w[\w-]*)/);
  if (sslmodeMatch) {
    switch (sslmodeMatch[1]) {
      case 'disable': return undefined;
      case 'require': case 'no-verify': return { rejectUnauthorized: false };
      case 'verify-ca': case 'verify-full': return { rejectUnauthorized: true };
    }
  }
  const isLocalhost = /localhost|127\.0\.0\.1|::1/.test(url);
  return isLocalhost ? undefined : { rejectUnauthorized: false };
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  const ssl = getSslConfig(url);
  const adapter = new PrismaPg({ connectionString: url, ssl });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
