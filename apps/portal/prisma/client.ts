import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

function isLocalhostUrl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    const stripped = hostname.replace(/^\[/, '').replace(/\]$/, '');
    return LOCAL_HOSTNAMES.has(stripped);
  } catch {
    return false;
  }
}

function createPrismaClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL!;
  const isLocalhost = isLocalhostUrl(rawUrl);
  const hasCABundle = !!process.env.NODE_EXTRA_CA_CERTS;
  const allowInsecure = process.env.PRISMA_ALLOW_INSECURE_TLS === '1';

  let ssl: undefined | true | { rejectUnauthorized: false };
  if (isLocalhost) {
    ssl = undefined;
  } else if (hasCABundle) {
    ssl = true;
  } else if (allowInsecure) {
    ssl = { rejectUnauthorized: false };
  } else {
    throw new Error(
      'Refusing to connect to a non-local Postgres without TLS verification. Set NODE_EXTRA_CA_CERTS to a CA bundle, or set PRISMA_ALLOW_INSECURE_TLS=1 if you intentionally want unverified TLS.',
    );
  }

  const url = ssl !== undefined ? stripSslMode(rawUrl) : rawUrl;
  const adapter = new PrismaPg({ connectionString: url, ssl });
  return new PrismaClient({
    adapter,
    transactionOptions: {
      timeout: 60000,
    },
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
