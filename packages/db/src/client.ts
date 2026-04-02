import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  const isLocalhost = /localhost|127\.0\.0\.1|::1/.test(url);
  // Use verified SSL when NODE_EXTRA_CA_CERTS is set (Docker with RDS CA bundle),
  // otherwise fall back to unverified SSL (Trigger.dev, Vercel, other environments).
  const hasCABundle = !!process.env.NODE_EXTRA_CA_CERTS;
  const ssl = isLocalhost ? undefined : hasCABundle ? true : { rejectUnauthorized: false };
  const adapter = new PrismaPg({ connectionString: url, ssl });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
