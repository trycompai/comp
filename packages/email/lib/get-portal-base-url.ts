/** Self-hosted installs set PORTAL_URL; cloud uses NEXT_PUBLIC_PORTAL_URL. */
export function getPortalBaseUrl(): string {
  return (
    process.env.PORTAL_URL ??
    process.env.NEXT_PUBLIC_PORTAL_URL ??
    process.env.TRUST_APP_URL ??
    'https://portal.trycomp.ai'
  ).replace(/\/+$/, '');
}
