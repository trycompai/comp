const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host);
}

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') && LOOPBACK_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function requiresRequestCredentials(params: {
  host: string;
  disableStaticAuth: boolean;
}): boolean {
  return params.disableStaticAuth || !isLoopbackHost(params.host);
}

export function getRequestSecurityError(params: {
  origin: string | string[] | undefined;
  apiKey: string | string[] | undefined;
  requireCredentials: boolean;
}): { status: number; message: string } | undefined {
  if (
    params.origin !== undefined &&
    (typeof params.origin !== 'string' || !isAllowedOrigin(params.origin))
  ) {
    return { status: 403, message: 'Origin not allowed' };
  }

  if (
    params.requireCredentials &&
    (typeof params.apiKey !== 'string' || params.apiKey.trim().length === 0)
  ) {
    return { status: 401, message: 'An apikey request header is required' };
  }

  return undefined;
}
