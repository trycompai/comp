import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { RDS_CA_BUNDLE } from './rds-ca-bundle';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

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
  const allowInsecure = process.env.PRISMA_ALLOW_INSECURE_TLS === '1';

  let ssl:
    | undefined
    | { ca: string; checkServerIdentity: () => undefined }
    | { rejectUnauthorized: false };
  if (isLocalhost) {
    ssl = undefined;
  } else if (allowInsecure) {
    ssl = { rejectUnauthorized: false };
  } else {
    // Verified TLS using the inlined AWS RDS CA bundle. Skip hostname check
    // because connections may traverse an AWS NLB whose hostname isn't in the
    // RDS Proxy cert's SAN list. The chain check still rejects forged or
    // wrong-CA certs.
    ssl = { ca: RDS_CA_BUNDLE, checkServerIdentity: () => undefined };
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

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
