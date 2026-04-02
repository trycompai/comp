import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Derive pg SSL config from the DATABASE_URL.
 *
 * pg@8+ defaults rejectUnauthorized to true, which rejects AWS RDS Proxy's
 * certificate (signed by internal AWS CA, not in Node.js root CA store).
 *
 * Per PostgreSQL sslmode spec:
 *   - disable:     no SSL
 *   - require:     encrypt, skip certificate verification
 *   - verify-ca:   encrypt + verify CA
 *   - verify-full: encrypt + verify CA + hostname
 *
 * When no sslmode is set, we default to SSL with rejectUnauthorized: false
 * for non-localhost connections (matches Prisma v6 behavior where the Rust
 * engine silently accepted all certificates).
 */
function getSslConfig(url: string): boolean | { rejectUnauthorized: boolean } | undefined {
  const sslmodeMatch = url.match(/sslmode=(\w[\w-]*)/);

  if (sslmodeMatch) {
    switch (sslmodeMatch[1]) {
      case 'disable':
        return undefined;
      case 'require':
      case 'no-verify':
        return { rejectUnauthorized: false };
      case 'verify-ca':
      case 'verify-full':
        return { rejectUnauthorized: true };
    }
  }

  // No sslmode specified — enable SSL for non-localhost (production default)
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
