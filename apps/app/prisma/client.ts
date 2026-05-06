import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { type PeerCertificate, rootCertificates } from 'node:tls';

import { RDS_CA_BUNDLE } from './rds-ca-bundle';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

// `ssl.ca` *replaces* Node's trust store rather than augmenting it. Our
// RDS bundle only contains regional RDS CAs; AWS RDS Proxy chains terminate
// at Amazon Root CA 1, which lives in Node's default Mozilla bundle.
const COMBINED_CA = [RDS_CA_BUNDLE, ...rootCertificates];

const isRdsHostname = (n: string): boolean =>
  n.endsWith('.rds.amazonaws.com') || n.endsWith('.rds.amazonaws.com.cn');

// Connections traverse an AWS NLB → RDS Proxy. The cert presented is the
// Proxy's, whose SAN list contains the proxy hostname but NOT the NLB
// hostname we dialed. Default hostname check fails. Instead of disabling
// identity verification entirely, assert the cert is for an AWS RDS
// endpoint — preserves protection against cert substitution while
// accepting the NLB hostname mismatch.
function rdsServerIdentity(_host: string, cert: PeerCertificate): Error | undefined {
  const sans = (cert.subjectaltname ?? '')
    .split(',')
    .map((s) => s.trim().replace(/^DNS:/, ''));
  const cn = (cert.subject as { CN?: string } | undefined)?.CN ?? '';
  if (isRdsHostname(cn) || sans.some(isRdsHostname)) return undefined;
  return new Error(
    `TLS hostname check: cert is not for an AWS RDS endpoint (CN=${cn}, SANs=${sans.join(',')})`,
  );
}

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
    | {
        ca: string[];
        checkServerIdentity: (host: string, cert: PeerCertificate) => Error | undefined;
      }
    | { rejectUnauthorized: false };
  if (isLocalhost) {
    ssl = undefined;
  } else if (allowInsecure) {
    ssl = { rejectUnauthorized: false };
  } else {
    ssl = { ca: COMBINED_CA, checkServerIdentity: rdsServerIdentity };
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
