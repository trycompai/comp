export function normalizeHostnameFromUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.hostname.toLowerCase().replace(/\.$/, '');
}

export function defaultProfileDisplayName(hostname: string): string {
  return `${hostname} browser profile`;
}

export function normalizeLoginIdentity(loginIdentity?: string | null): string {
  return loginIdentity?.trim().toLowerCase() ?? '';
}
