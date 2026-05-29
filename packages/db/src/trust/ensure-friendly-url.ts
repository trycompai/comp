import { Prisma, type PrismaClient } from '@prisma/client';

/**
 * Minimal Prisma surface this helper needs. Callers pass their OWN PrismaClient
 * — the API (`@db`), the app (`@db/server`), and this package each instantiate a
 * separate client with its own connection pool / TLS config, so we never bake a
 * client into this module.
 */
type TrustDbClient = Pick<PrismaClient, 'trust'>;

/** URL-safe slug from an org name (canonical implementation, shared everywhere). */
export function slugifyOrganizationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/**
 * Idempotently ensure an org has a Trust row with a friendly URL, published by
 * default so the public portal is live even when empty.
 *
 * Guarantees:
 * - Never rewrites an existing `friendlyUrl` (keeps already-shared links working).
 * - Never changes `status` on an existing row (a deliberately-draft portal stays draft).
 * - New rows are created with `status: 'published'`.
 * - Safe under concurrency: on a unique-constraint race it re-reads and returns the winner.
 *
 * Returns the resolved `friendlyUrl`.
 */
export async function ensureTrustForOrganization({
  db,
  organizationId,
  organizationName,
}: {
  db: TrustDbClient;
  organizationId: string;
  organizationName: string;
}): Promise<string> {
  const existing = await db.trust.findUnique({
    where: { organizationId },
    select: { friendlyUrl: true },
  });
  if (existing?.friendlyUrl) return existing.friendlyUrl;

  const base = slugifyOrganizationName(organizationName) || `org-${organizationId.slice(-8)}`;

  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;

    const taken = await db.trust.findUnique({
      where: { friendlyUrl: candidate },
      select: { organizationId: true },
    });
    if (taken && taken.organizationId !== organizationId) continue;

    try {
      await db.trust.upsert({
        where: { organizationId },
        update: { friendlyUrl: candidate }, // never touch status on an existing row
        create: { organizationId, friendlyUrl: candidate, status: 'published' },
      });
      return candidate;
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error;
      // Another writer won (same org, or this friendlyUrl was just claimed).
      const won = await db.trust.findUnique({
        where: { organizationId },
        select: { friendlyUrl: true },
      });
      if (won?.friendlyUrl) return won.friendlyUrl;
      // friendlyUrl collided with a different org — try the next candidate.
    }
  }

  // Slug space exhausted — fall back to the orgId (unique per org).
  try {
    await db.trust.upsert({
      where: { organizationId },
      update: { friendlyUrl: organizationId },
      create: { organizationId, friendlyUrl: organizationId, status: 'published' },
    });
    return organizationId;
  } catch (error: unknown) {
    if (!isUniqueViolation(error)) throw error;
    const won = await db.trust.findUnique({
      where: { organizationId },
      select: { friendlyUrl: true },
    });
    if (won?.friendlyUrl) return won.friendlyUrl;
    throw error;
  }
}
