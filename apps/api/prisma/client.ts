import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Derive pg SSL config from the DATABASE_URL sslmode parameter.
 *
 * pg-connection-string parses sslmode=require into ssl: {} (empty object),
 * and pg@8+ treats ssl: {} as { rejectUnauthorized: true }, which rejects
 * AWS RDS Proxy's self-signed certificate. This is a known pg@8 breaking
 * change (https://node-postgres.com/announcements#ssl-by-default).
 *
 * Per PostgreSQL spec (https://www.postgresql.org/docs/current/libpq-ssl.html):
 *   - require:     encrypt connection, skip certificate verification
 *   - verify-ca:   encrypt + verify server CA
 *   - verify-full: encrypt + verify CA + verify hostname
 *
 * Per Prisma v7 migration docs: "SSL certificate defaults have changed.
 * Previously [v6 Rust engine], invalid SSL certificates were ignored."
 * (https://www.prisma.io/docs/orm/more/upgrades/to-v7)
 *
 * Our infra enforces sslmode=require with RDS Proxy (requireTls: true).
 * The proxy's certificate is signed by an internal AWS CA not in Node.js's
 * root CA store, so rejectUnauthorized: false is required. The connection
 * is still TLS-encrypted — only identity verification is skipped.
 */
function getSslConfig(url: string): boolean | { rejectUnauthorized: boolean } | undefined {
  const match = url.match(/sslmode=(\w[\w-]*)/);
  if (!match) return undefined;

  const mode = match[1];
  switch (mode) {
    case 'disable':
      return undefined;
    case 'require':
    case 'no-verify':
      return { rejectUnauthorized: false };
    case 'verify-ca':
    case 'verify-full':
      return { rejectUnauthorized: true };
    default:
      return undefined;
  }
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL!;
  const ssl = getSslConfig(url);
  // Strip sslmode from connection string — pg parses it independently and
  // can override our explicit ssl config. We handle SSL entirely via the ssl option.
  const cleanUrl = url.replace(/[?&]sslmode=\w[\w-]*/g, '').replace(/\?&/, '?').replace(/\?$/, '');
  const adapter = new PrismaPg({ connectionString: cleanUrl, ssl });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
