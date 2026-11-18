#!/usr/bin/env bun
/**
 * Seed a small test organization for exercising migrate-org-email-domain
 * (and the merge-duplicate-user task it triggers for each matched pair).
 *
 * Usage:
 *   bun run apps/api/src/scripts/seed-email-domain-migration-test-data.ts
 *
 * Idempotent: re-running upserts the same org/users by slug/email instead of
 * creating duplicates, so you can reseed after a merge run to reset state.
 *
 * Creates one org with member/email pairs covering:
 *   - alice: a clean pair with no other data attached
 *   - bob:   a pair where the old member has a task + comment to re-point
 *   - carol: old-domain only, no new-domain counterpart (should be skipped)
 *   - dave:  new-domain only, no old-domain counterpart (unaffected)
 *   - frank: old-domain email in a different case (tests normalization)
 *   - erin:  old user is also a member of a second org (tests the
 *            merge-duplicate-user guard that keeps the User row when it
 *            belongs to more than one org)
 */

import { db } from '@db';

const ORG_SLUG = 'email-migration-test-org';
const OTHER_ORG_SLUG = 'email-migration-test-other-org';
const OLD_DOMAIN = 'oldcorp.test';
const NEW_DOMAIN = 'newcorp.test';

async function upsertOrg(slug: string, name: string) {
  return db.organization.upsert({
    where: { slug },
    create: { slug, name, onboardingCompleted: true, hasAccess: true },
    update: { name },
  });
}

async function upsertUser(email: string, name: string) {
  return db.user.upsert({
    where: { email },
    create: { email, name, emailVerified: true },
    update: { name },
  });
}

async function upsertMember({
  organizationId,
  userId,
  role = 'employee',
}: {
  organizationId: string;
  userId: string;
  role?: string;
}) {
  const existing = await db.member.findFirst({
    where: { organizationId, userId },
  });
  if (existing) return existing;
  return db.member.create({ data: { organizationId, userId, role } });
}

async function main() {
  console.log('Seeding email-domain-migration test data...\n');

  const org = await upsertOrg(ORG_SLUG, 'Email Migration Test Org');
  const otherOrg = await upsertOrg(
    OTHER_ORG_SLUG,
    'Email Migration Test Other Org',
  );

  // 1. Clean pair — merges with no other data attached.
  const alice = {
    old: await upsertUser(`alice@${OLD_DOMAIN}`, 'Alice Old'),
    new: await upsertUser(`alice@${NEW_DOMAIN}`, 'Alice New'),
  };
  await upsertMember({ organizationId: org.id, userId: alice.old.id });
  await upsertMember({ organizationId: org.id, userId: alice.new.id });

  // 2. Pair where the old member owns real data that should get re-pointed.
  const bob = {
    old: await upsertUser(`bob@${OLD_DOMAIN}`, 'Bob Old'),
    new: await upsertUser(`bob@${NEW_DOMAIN}`, 'Bob New'),
  };
  const bobOldMember = await upsertMember({
    organizationId: org.id,
    userId: bob.old.id,
  });
  await upsertMember({ organizationId: org.id, userId: bob.new.id });

  const bobTask = await db.task.create({
    data: {
      organizationId: org.id,
      title: 'Review vendor security questionnaire',
      description:
        'Seeded task assigned to the old member — should re-point to the new member after merge.',
      assigneeId: bobOldMember.id,
    },
  });
  await db.comment.create({
    data: {
      organizationId: org.id,
      authorId: bobOldMember.id,
      entityId: bobTask.id,
      entityType: 'task',
      content: 'Seeded comment authored by the old member.',
    },
  });

  // 3. Old-domain only — no new-domain counterpart, so the migration must skip it.
  const carolOld = await upsertUser(`carol@${OLD_DOMAIN}`, 'Carol NoMatch');
  await upsertMember({ organizationId: org.id, userId: carolOld.id });

  // 4. New-domain only — already migrated, unaffected either way.
  const daveNew = await upsertUser(`dave@${NEW_DOMAIN}`, 'Dave New');
  await upsertMember({ organizationId: org.id, userId: daveNew.id });

  // 5. Case-insensitive match: uppercase old-domain email vs. lowercase new-domain email.
  const frank = {
    old: await upsertUser(`FRANK@${OLD_DOMAIN.toUpperCase()}`, 'Frank Old'),
    new: await upsertUser(`frank@${NEW_DOMAIN}`, 'Frank New'),
  };
  await upsertMember({ organizationId: org.id, userId: frank.old.id });
  await upsertMember({ organizationId: org.id, userId: frank.new.id });

  // 6. Old user also belongs to a second org — the User row must survive the merge.
  const erin = {
    old: await upsertUser(`erin@${OLD_DOMAIN}`, 'Erin Old'),
    new: await upsertUser(`erin@${NEW_DOMAIN}`, 'Erin New'),
  };
  await upsertMember({ organizationId: org.id, userId: erin.old.id });
  await upsertMember({ organizationId: org.id, userId: erin.new.id });
  await upsertMember({ organizationId: otherOrg.id, userId: erin.old.id });

  console.log('Seed complete.\n');
  console.log(`organizationId:      ${org.id}`);
  console.log(`otherOrganizationId: ${otherOrg.id}  (holds erin's other membership)`);
  console.log(`oldDomain:           ${OLD_DOMAIN}`);
  console.log(`newDomain:           ${NEW_DOMAIN}`);

  console.log('\nExpected to merge:');
  console.log(`  alice@${OLD_DOMAIN} -> alice@${NEW_DOMAIN}  (clean merge)`);
  console.log(`  bob@${OLD_DOMAIN} -> bob@${NEW_DOMAIN}  (task + comment re-pointed)`);
  console.log(`  frank@${OLD_DOMAIN.toLowerCase()} -> frank@${NEW_DOMAIN}  (case-insensitive match)`);
  console.log(`  erin@${OLD_DOMAIN} -> erin@${NEW_DOMAIN}  (old user's account survives — still in ${OTHER_ORG_SLUG})`);

  console.log('\nExpected to skip:');
  console.log(`  carol@${OLD_DOMAIN}  (no new-domain counterpart)`);
  console.log(`  dave@${NEW_DOMAIN}  (no old-domain counterpart)`);

  console.log('\nTrigger the migration with:');
  console.log(
    `  migrateOrgEmailDomain.trigger({ organizationId: '${org.id}', oldDomain: '${OLD_DOMAIN}', newDomain: '${NEW_DOMAIN}' })`,
  );

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error('Seeding failed:', error);
  await db.$disconnect();
  process.exit(1);
});
