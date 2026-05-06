import { rootCertificates } from 'node:tls';
import { RDS_CA_BUNDLE } from './rds-ca-bundle';

export type SslConfig =
  | undefined
  | { ca: string | string[]; checkServerIdentity: () => undefined }
  | { rejectUnauthorized: false };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalhostUrl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    const stripped = hostname.replace(/^\[/, '').replace(/\]$/, '');
    return LOCAL_HOSTNAMES.has(stripped);
  } catch {
    // Malformed URL — be conservative and treat as remote so we don't
    // accidentally disable TLS verification.
    return false;
  }
}

// Combine the inlined AWS RDS CA bundle with Node's default trust roots.
// Node's `ssl.ca` *replaces* the trust store rather than augmenting it, so
// passing only the RDS bundle drops the public Mozilla roots — including
// Amazon Root CA 1, which is what AWS RDS Proxy chains terminate at. The
// RDS bundle on its own only contains regional self-signed RDS CAs, so a
// Proxy connection would fail chain validation. Combining covers both
// direct RDS instance (regional CA) and RDS Proxy (Amazon Root CA 1) paths.
const COMBINED_CA = [RDS_CA_BUNDLE, ...rootCertificates];

export function resolveSslConfig(
  databaseUrl: string,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): SslConfig {
  if (isLocalhostUrl(databaseUrl)) return undefined;
  if (env.PRISMA_ALLOW_INSECURE_TLS === '1') return { rejectUnauthorized: false };
  // Verified TLS using the inlined AWS RDS CA bundle plus Node defaults.
  // Skip the hostname check because connections may traverse an AWS NLB
  // whose hostname isn't in the RDS Proxy cert's SAN list. The chain check
  // still rejects forged or wrong-CA certs.
  return { ca: COMBINED_CA, checkServerIdentity: () => undefined };
}
