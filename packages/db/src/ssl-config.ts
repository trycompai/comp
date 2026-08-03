export type SslConfig =
  | undefined
  | { checkServerIdentity: () => undefined }
  | { rejectUnauthorized: false };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalhostUrl(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get('sslmode') === 'disable') {
      return true;
    }
    const stripped = url.hostname.replace(/^\[/, '').replace(/\]$/, '');
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
  return { checkServerIdentity: () => undefined };
}
