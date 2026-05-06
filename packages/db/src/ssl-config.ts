import { RDS_CA_BUNDLE } from './rds-ca-bundle';

export type SslConfig =
  | undefined
  | { ca: string; checkServerIdentity: () => undefined }
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

export function resolveSslConfig(
  databaseUrl: string,
  env: Partial<NodeJS.ProcessEnv> = process.env,
): SslConfig {
  if (isLocalhostUrl(databaseUrl)) return undefined;
  if (env.PRISMA_ALLOW_INSECURE_TLS === '1') return { rejectUnauthorized: false };
  // Verified TLS using the inlined AWS RDS CA bundle. Skip the hostname check
  // because connections may traverse an AWS NLB whose hostname isn't in the
  // RDS Proxy cert's SAN list. The chain check still rejects forged or
  // wrong-CA certs.
  return { ca: RDS_CA_BUNDLE, checkServerIdentity: () => undefined };
}
