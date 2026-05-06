export type SslConfig =
  | undefined
  | { checkServerIdentity: () => undefined }
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
  const isLocalhost = isLocalhostUrl(databaseUrl);
  const hasCABundle = !!env.NODE_EXTRA_CA_CERTS;
  const allowInsecure = env.PRISMA_ALLOW_INSECURE_TLS === '1';

  if (isLocalhost) return undefined;
  // Verified TLS: rely on Node's TLS context (NODE_EXTRA_CA_CERTS adds the AWS
  // RDS CA to the trust store). Skip hostname check because connections may
  // traverse an AWS NLB whose hostname isn't in the RDS Proxy cert's SAN list.
  // The chain check still rejects forged or wrong-CA certs.
  if (hasCABundle) return { checkServerIdentity: () => undefined };
  if (allowInsecure) return { rejectUnauthorized: false };
  throw new Error(
    'Refusing to connect to a non-local Postgres without TLS verification. Set NODE_EXTRA_CA_CERTS to a CA bundle, or set PRISMA_ALLOW_INSECURE_TLS=1 if you intentionally want unverified TLS.',
  );
}
