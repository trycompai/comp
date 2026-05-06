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
  if (isLocalhostUrl(databaseUrl)) return undefined;
  if (env.PRISMA_ALLOW_INSECURE_TLS === '1') return { rejectUnauthorized: false };
  // Verified TLS via Node's default trust store, which includes Amazon Root
  // CA 1 — where AWS RDS Proxy chains terminate. Hostname check is skipped
  // because connections traverse an AWS NLB whose hostname isn't in the RDS
  // Proxy cert's SAN list; the chain check still rejects forged or wrong-CA
  // certs.
  //
  // Previously this returned `{ ca: RDS_CA_BUNDLE, ... }` — but `ssl.ca`
  // *replaces* Node's trust store rather than augmenting it, and the bundle
  // only contains regional RDS CAs (not Amazon Root CA 1), so RDS Proxy
  // chain validation failed at runtime (P1011 / TlsConnectionError).
  return { checkServerIdentity: () => undefined };
}
