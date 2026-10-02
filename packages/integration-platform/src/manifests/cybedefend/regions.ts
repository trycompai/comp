/**
 * CybeDefend is deployed per region and has no single global URL. Every URL is
 * derived here, the form never accepts a host, so no other domain is reachable.
 */
export const CYBEDEFEND_REGION_IDS = ['eu', 'us', 'dedicated'] as const;

export type CybeDefendRegion = (typeof CYBEDEFEND_REGION_IDS)[number];

const PUBLIC_REGIONS = ['eu', 'us'] as const;

/**
 * Load-bearing, not cosmetic: the URLs are built by interpolation, so
 * `x@evil.com/` would yield `https://api-x@evil.com/.cybedefend.com`, whose
 * host is evil.com. The token would then be posted to an attacker.
 *
 * Capped at 58 so the longest derived label, `auth-${tenant}`, stays within the
 * 63-character DNS limit.
 */
export const MAX_TENANT_LENGTH = 58;

export const TENANT_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/;

export const TENANT_RULE = `may only contain lowercase letters, digits and hyphens, cannot start or end with a hyphen, and must be at most ${MAX_TENANT_LENGTH} characters`;

export interface CybeDefendRegionUrls {
  /** Base URL of the deployment's API. Doubles as the OAuth resource indicator. */
  apiBaseUrl: string;
  /** Logto endpoint used to exchange the personal access token. */
  logtoEndpoint: string;
  /** Base URL of the web UI, used to build deep links. */
  appBaseUrl: string;
}

export interface ResolveRegionOptions {
  region: string;
  /** Required when `region` is `dedicated`, ignored otherwise. */
  tenant?: string;
}

export const isCybeDefendRegion = (value: unknown): value is CybeDefendRegion =>
  typeof value === 'string' && (CYBEDEFEND_REGION_IDS as readonly string[]).includes(value);

const urlsFor = (slug: string): CybeDefendRegionUrls => ({
  apiBaseUrl: `https://api-${slug}.cybedefend.com`,
  logtoEndpoint: `https://auth-${slug}.cybedefend.com`,
  appBaseUrl: `https://${slug}.cybedefend.com`,
});

/** Derives a deployment's URLs, failing closed on anything unrecognised. */
export const resolveRegion = ({ region, tenant }: ResolveRegionOptions): CybeDefendRegionUrls => {
  if (!isCybeDefendRegion(region)) {
    throw new Error(
      `Unsupported CybeDefend region "${region}". Supported regions: ${CYBEDEFEND_REGION_IDS.join(', ')}.`,
    );
  }

  if ((PUBLIC_REGIONS as readonly string[]).includes(region)) {
    return urlsFor(region);
  }

  const slug = tenant?.trim().toLowerCase() ?? '';

  if (!slug) {
    throw new Error('A CybeDefend tenant name is required for a dedicated tenant.');
  }

  if (!TENANT_PATTERN.test(slug)) {
    throw new Error(`The CybeDefend tenant name ${TENANT_RULE}.`);
  }

  return urlsFor(slug);
};
