const DEFAULT_TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3333',
  'http://localhost:3004',
  'http://localhost:3008',
  'https://app.trycomp.ai',
  'https://portal.trycomp.ai',
  'https://api.trycomp.ai',
  'https://app.staging.trycomp.ai',
  'https://portal.staging.trycomp.ai',
  'https://api.staging.trycomp.ai',
  'https://dev.trycomp.ai',
  'https://framework-editor.trycomp.ai',
];

const COMP_EXTENSION_ALLOWED_ROUTES = [
  { method: 'GET', path: '/api/auth/get-session' },
  { method: 'GET', path: '/v1/auth/me' },
  { method: 'POST', path: '/api/auth/organization/set-active' },
  { method: 'POST', path: '/v1/questionnaire/answer-single' },
];

function parseOriginList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function normalizePath(path: string): string {
  if (path.length <= 1) return path;
  return path.replace(/\/+$/, '');
}

export function getTrustedOrigins(): string[] {
  const origins = parseOriginList(process.env.AUTH_TRUSTED_ORIGINS);
  return origins.length > 0 ? origins : [...DEFAULT_TRUSTED_ORIGINS];
}

export function getCompExtensionTrustedOrigins(): string[] {
  return parseOriginList(process.env.COMP_EXTENSION_TRUSTED_ORIGINS);
}

export function getBetterAuthTrustedOrigins(): string[] {
  return [...getTrustedOrigins(), ...getCompExtensionTrustedOrigins()];
}

export function isCompExtensionOrigin(origin: string): boolean {
  return getCompExtensionTrustedOrigins().includes(origin);
}

export function isChromeExtensionOrigin(origin: string): boolean {
  try {
    return new URL(origin).protocol === 'chrome-extension:';
  } catch {
    return false;
  }
}

export function isCompExtensionAllowedRoute(params: {
  method: string;
  path: string;
}): boolean {
  const method = params.method.toUpperCase();
  const path = normalizePath(params.path);
  return COMP_EXTENSION_ALLOWED_ROUTES.some(
    (route) => route.method === method && route.path === path,
  );
}

export function isCompExtensionOriginAllowedForRequest(params: {
  method: string;
  origin: string;
  path: string;
}): boolean {
  return (
    isCompExtensionOrigin(params.origin) &&
    isCompExtensionAllowedRoute({ method: params.method, path: params.path })
  );
}

export function isStaticTrustedOrigin(origin: string): boolean {
  const trustedOrigins = getTrustedOrigins();
  if (trustedOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      url.hostname.endsWith('.trycomp.ai') ||
      url.hostname.endsWith('.staging.trycomp.ai') ||
      url.hostname.endsWith('.trust.inc') ||
      url.hostname === 'trust.inc'
    );
  } catch {
    return false;
  }
}

export function isStaticTrustedOriginForRequest(params: {
  method: string;
  origin: string;
  path: string;
}): boolean {
  return (
    isStaticTrustedOrigin(params.origin) ||
    isCompExtensionOriginAllowedForRequest(params)
  );
}
