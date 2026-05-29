import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../client';
import { ensureTrustForOrganization, slugifyOrganizationName } from './ensure-friendly-url';

const dbUrl = process.env.DATABASE_URL ?? '';
if (
  dbUrl.includes('prod') ||
  dbUrl.includes('staging') ||
  (!dbUrl.includes('test') && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'))
) {
  throw new Error(
    `Refusing to run destructive tests. DATABASE_URL must target a local/test DB; got: ${dbUrl}`,
  );
}

const TEST_PREFIX = 'zz-ensure-trust-spec';
const createdOrgIds: string[] = [];

async function makeOrg(name: string): Promise<string> {
  const org = await db.organization.create({ data: { name } });
  createdOrgIds.push(org.id);
  return org.id;
}

describe('slugifyOrganizationName', () => {
  it('lowercases, replaces & with and, and collapses non-alphanumerics', () => {
    expect(slugifyOrganizationName('Acme & Co, Inc.')).toBe('acme-and-co-inc');
  });
  it('trims leading/trailing dashes and caps at 60 chars', () => {
    expect(slugifyOrganizationName('  --Hello World--  ')).toBe('hello-world');
    expect(slugifyOrganizationName('a'.repeat(100)).length).toBe(60);
  });
});

describe('ensureTrustForOrganization', () => {
  beforeEach(async () => {
    await db.trust.deleteMany({
      where: { organization: { name: { startsWith: TEST_PREFIX } } },
    });
    await db.organization.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
    createdOrgIds.length = 0;
  });

  afterEach(async () => {
    if (createdOrgIds.length) {
      await db.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
    }
  });

  it('creates a published trust row with a slug friendlyUrl', async () => {
    const name = `${TEST_PREFIX} Alpha`;
    const orgId = await makeOrg(name);

    const friendlyUrl = await ensureTrustForOrganization({
      db,
      organizationId: orgId,
      organizationName: name,
    });

    expect(friendlyUrl).toBe(slugifyOrganizationName(name));
    const trust = await db.trust.findUnique({ where: { organizationId: orgId } });
    expect(trust?.status).toBe('published');
    expect(trust?.friendlyUrl).toBe(friendlyUrl);
  });

  it('is idempotent and never rewrites an existing friendlyUrl', async () => {
    const name = `${TEST_PREFIX} Beta`;
    const orgId = await makeOrg(name);

    const first = await ensureTrustForOrganization({
      db,
      organizationId: orgId,
      organizationName: name,
    });
    // Even with a different name on a second call, the existing slug is kept.
    const second = await ensureTrustForOrganization({
      db,
      organizationId: orgId,
      organizationName: `${TEST_PREFIX} Beta Renamed`,
    });

    expect(second).toBe(first);
    const rows = await db.trust.count({ where: { organizationId: orgId } });
    expect(rows).toBe(1);
  });

  it('does not republish a deliberately-drafted portal', async () => {
    const name = `${TEST_PREFIX} Gamma`;
    const orgId = await makeOrg(name);
    // Admin created a draft portal with no friendlyUrl yet.
    await db.trust.create({
      data: { organizationId: orgId, status: 'draft' },
    });

    await ensureTrustForOrganization({ db, organizationId: orgId, organizationName: name });

    const trust = await db.trust.findUnique({ where: { organizationId: orgId } });
    expect(trust?.status).toBe('draft'); // status untouched
    expect(trust?.friendlyUrl).toBe(slugifyOrganizationName(name)); // slug filled in
  });

  it('suffixes the slug on collision with another org', async () => {
    const name = `${TEST_PREFIX} Dup`;
    const orgA = await makeOrg(name);
    const orgB = await makeOrg(name);

    const slugA = await ensureTrustForOrganization({
      db,
      organizationId: orgA,
      organizationName: name,
    });
    const slugB = await ensureTrustForOrganization({
      db,
      organizationId: orgB,
      organizationName: name,
    });

    expect(slugA).toBe(slugifyOrganizationName(name));
    expect(slugB).toBe(`${slugifyOrganizationName(name)}-2`);
  });
});
