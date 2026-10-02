import { db, Prisma } from '@db';

/** URL generation must never publish an organization as a side effect. */
export async function ensureTrustFriendlyUrl(
  organizationId: string,
): Promise<string> {
  const current = await db.trust.findUnique({
    where: { organizationId },
    select: { friendlyUrl: true },
  });
  if (current?.friendlyUrl) return current.friendlyUrl;

  try {
    await db.trust.upsert({
      where: { organizationId },
      update: { friendlyUrl: organizationId },
      create: { organizationId, friendlyUrl: organizationId, status: 'draft' },
    });
    return organizationId;
  } catch (error: unknown) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      throw error;
    }
    const existing = await db.trust.findUnique({
      where: { organizationId },
      select: { friendlyUrl: true },
    });
    return existing?.friendlyUrl ?? organizationId;
  }
}

export async function buildTrustPortalBaseUrl(
  organizationId: string,
): Promise<string> {
  const trust = await db.trust.findUnique({
    where: { organizationId },
    select: { domain: true, domainVerified: true, friendlyUrl: true },
  });
  if (trust?.domain && trust.domainVerified) {
    const domain = trust.domain
      .trim()
      .replace(/^https?:\/\//i, '')
      .split('/')[0];
    return `https://${domain.trim().toLowerCase()}`;
  }

  const appUrl = process.env.TRUST_APP_URL || process.env.PORTAL_URL;
  if (!appUrl && process.env.NODE_ENV === 'production') {
    throw new Error('TRUST_APP_URL or PORTAL_URL must be set in production');
  }
  const baseUrl = (appUrl || 'http://localhost:3008').replace(/\/$/, '');
  const friendlyUrl =
    trust?.friendlyUrl || (await ensureTrustFriendlyUrl(organizationId));
  return `${baseUrl}/${friendlyUrl}`;
}

export async function buildTrustPortalAccessUrl(params: {
  organizationId: string;
  accessToken: string;
  query?: string;
}): Promise<string> {
  const base = await buildTrustPortalBaseUrl(params.organizationId);
  const accessUrl = `${base}/access/${params.accessToken}`;
  return params.query
    ? `${accessUrl}?query=${encodeURIComponent(params.query)}`
    : accessUrl;
}
