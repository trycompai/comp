/**
 * Local development seed: test users, two test organizations, API keys and
 * ready-to-use sessions. It refuses to run against a non-local database.
 *
 * Run: DATABASE_URL=... SECRET_KEY=... bun prisma/seed/local-dev.ts
 * Output: packages/db/.local-dev-credentials.json (gitignored) and stdout.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { statement } from '../../../auth/src/permissions';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const SESSION_COOKIE_NAME = 'local.session_token';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Same rule as ApiKeyService.getAvailableScopes: every resource:action pair.
const INTERNAL_ONLY_RESOURCES = new Set(['invitation', 'team']);
const ALL_API_SCOPES = Object.entries(statement)
  .filter(([resource]) => !INTERNAL_ONLY_RESOURCES.has(resource))
  .flatMap(([resource, actions]) => actions.map((action) => `${resource}:${action}`));
const CREDENTIALS_FILE = path.join(__dirname, '..', '..', '.local-dev-credentials.json');

type SeedOrg = { id: string; name: string; slug: string };
type SeedUser = { id: string; email: string; name: string; orgId: string; role: string };

const ORGS: SeedOrg[] = [
  { id: 'org_local_a', name: 'Local Org A', slug: 'local-org-a' },
  { id: 'org_local_b', name: 'Local Org B', slug: 'local-org-b' },
];

const USERS: SeedUser[] = [
  {
    id: 'usr_local_owner_a',
    email: 'owner-a@example.com',
    name: 'Owner A',
    orgId: 'org_local_a',
    role: 'owner',
  },
  {
    id: 'usr_local_employee_a',
    email: 'employee-a@example.com',
    name: 'Employee A',
    orgId: 'org_local_a',
    role: 'employee',
  },
  {
    id: 'usr_local_owner_b',
    email: 'owner-b@example.com',
    name: 'Owner B',
    orgId: 'org_local_b',
    role: 'owner',
  },
];

function assertLocalDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set.');
  }
  const host = new URL(databaseUrl).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to seed local test data into a non-local database (${host}).`);
  }
  return databaseUrl;
}

function requireSecret(): string {
  const secret = process.env.SECRET_KEY;
  if (!secret) {
    throw new Error('SECRET_KEY is not set. Use the same value as the API.');
  }
  return secret;
}

/** Same format as better-call signCookieValue: `${value}.${base64 HMAC-SHA256}`. */
function signCookieValue({ value, secret }: { value: string; secret: string }): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return encodeURIComponent(`${value}.${signature}`);
}

/** Same format as ApiKeyService in apps/api/src/auth/api-key.service.ts. */
function createApiKey(): { plain: string; hashed: string; salt: string; prefix: string } {
  const plain = `comp_${randomBytes(32).toString('hex')}`;
  const salt = randomBytes(16).toString('hex');
  const hashed = createHash('sha256')
    .update(plain + salt)
    .digest('hex');
  return { plain, hashed, salt, prefix: plain.slice(5, 13) };
}

async function seedOrg({ prisma, org }: { prisma: PrismaClient; org: SeedOrg }) {
  await prisma.organization.upsert({
    where: { id: org.id },
    create: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      website: 'https://example.com',
      onboardingCompleted: true,
      hasAccess: true,
    },
    update: { name: org.name, onboardingCompleted: true, hasAccess: true },
  });
}

async function seedUser({ prisma, user }: { prisma: PrismaClient; user: SeedUser }) {
  await prisma.user.upsert({
    where: { email: user.email },
    create: { id: user.id, email: user.email, name: user.name, emailVerified: true },
    update: { name: user.name, emailVerified: true },
  });
  const existing = await prisma.member.findFirst({
    where: { userId: user.id, organizationId: user.orgId },
  });
  if (existing) {
    await prisma.member.update({
      where: { id: existing.id },
      data: { role: user.role, isActive: true, deactivated: false },
    });
    return existing.id;
  }
  const member = await prisma.member.create({
    data: { userId: user.id, organizationId: user.orgId, role: user.role },
  });
  return member.id;
}

async function createSession({
  prisma,
  user,
  secret,
}: {
  prisma: PrismaClient;
  user: SeedUser;
  secret: string;
}) {
  const token = randomBytes(24).toString('base64url');
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      activeOrganizationId: user.orgId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: 'local-dev-seed',
    },
  });
  return { token, cookie: `${SESSION_COOKIE_NAME}=${signCookieValue({ value: token, secret })}` };
}

async function createOrgApiKey({
  prisma,
  orgId,
  memberId,
}: {
  prisma: PrismaClient;
  orgId: string;
  memberId: string;
}) {
  const key = createApiKey();
  await prisma.apiKey.updateMany({
    where: { organizationId: orgId, name: 'Local dev seed key' },
    data: { isActive: false },
  });
  await prisma.apiKey.create({
    data: {
      name: 'Local dev seed key',
      key: key.hashed,
      salt: key.salt,
      keyPrefix: key.prefix,
      organizationId: orgId,
      createdByMemberId: memberId,
      scopes: ALL_API_SCOPES,
    },
  });
  return key.plain;
}

async function main() {
  const databaseUrl = assertLocalDatabase(process.env.DATABASE_URL);
  const secret = requireSecret();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    for (const org of ORGS) {
      await seedOrg({ prisma, org });
    }

    const users = [];
    const ownerMemberIds = new Map<string, string>();
    for (const user of USERS) {
      const memberId = await seedUser({ prisma, user });
      if (user.role === 'owner') ownerMemberIds.set(user.orgId, memberId);
      const session = await createSession({ prisma, user, secret });
      users.push({
        email: user.email,
        role: user.role,
        organizationId: user.orgId,
        sessionCookie: session.cookie,
        bearerToken: session.token,
      });
    }

    const apiKeys: Record<string, string> = {};
    for (const org of ORGS) {
      const memberId = ownerMemberIds.get(org.id);
      if (!memberId) continue;
      apiKeys[org.id] = await createOrgApiKey({ prisma, orgId: org.id, memberId });
    }

    const credentials = { organizations: ORGS, users, apiKeys };
    await fs.writeFile(CREDENTIALS_FILE, `${JSON.stringify(credentials, null, 2)}\n`, {
      mode: 0o600,
    });
    console.log(`Local dev seed complete. Credentials written to ${CREDENTIALS_FILE}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Local dev seed failed:', error);
  process.exit(1);
});
