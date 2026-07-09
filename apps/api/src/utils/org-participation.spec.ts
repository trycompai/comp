jest.mock('@db', () => ({
  db: { organization: { findUnique: jest.fn() } },
  Prisma: {},
}));

import { db } from '@db';
import {
  getOrgIsInternal,
  isMemberOrgParticipant,
  orgParticipantMemberWhere,
  orgParticipantMemberWhereForFlag,
} from './org-participation';

const orgFindUnique = db.organization.findUnique as jest.Mock;

describe('org-participation', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getOrgIsInternal', () => {
    it('returns true when the org is internal', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: true });
      await expect(getOrgIsInternal('org_1')).resolves.toBe(true);
    });

    it('returns false when the org is not internal', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: false });
      await expect(getOrgIsInternal('org_1')).resolves.toBe(false);
    });

    it('returns false when the org is not found', async () => {
      orgFindUnique.mockResolvedValue(null);
      await expect(getOrgIsInternal('missing')).resolves.toBe(false);
    });
  });

  describe('isMemberOrgParticipant', () => {
    it('excludes a platform admin in a customer org', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: false });
      await expect(isMemberOrgParticipant('admin', 'org_1')).resolves.toBe(
        false,
      );
    });

    it('includes a platform admin in an internal org', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: true });
      await expect(isMemberOrgParticipant('admin', 'org_1')).resolves.toBe(
        true,
      );
    });

    it('includes non-admins regardless of org type', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: false });
      await expect(isMemberOrgParticipant('user', 'org_1')).resolves.toBe(true);
      await expect(isMemberOrgParticipant(null, 'org_1')).resolves.toBe(true);
    });
  });

  describe('orgParticipantMemberWhereForFlag', () => {
    it('returns an empty fragment for internal orgs (no exclusion)', () => {
      expect(orgParticipantMemberWhereForFlag(true)).toEqual({});
    });

    it('excludes only platform admins (incl. null roles) for customer orgs', () => {
      expect(orgParticipantMemberWhereForFlag(false)).toEqual({
        AND: [{ user: { OR: [{ role: { not: 'admin' } }, { role: null }] } }],
      });
    });

    it('is spread-safe: does not clobber a caller-supplied user filter', () => {
      // Regression: the fragment used to return a bare `user` key, which
      // overwrote the mention notifiers' `user: { id: { in } }` filter and
      // broadcast to the whole org. `AND` must keep both conditions.
      const where = {
        organizationId: 'org_1',
        user: { id: { in: ['u1', 'u2'] } },
        ...orgParticipantMemberWhereForFlag(false),
      };
      expect(where.user).toEqual({ id: { in: ['u1', 'u2'] } });
      expect(where.AND).toEqual([
        { user: { OR: [{ role: { not: 'admin' } }, { role: null }] } },
      ]);
    });
  });

  describe('orgParticipantMemberWhere', () => {
    it('returns an empty fragment for internal orgs (no exclusion)', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: true });
      await expect(orgParticipantMemberWhere('org_1')).resolves.toEqual({});
    });

    it('excludes only platform admins (incl. null roles) for customer orgs', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: false });
      await expect(orgParticipantMemberWhere('org_1')).resolves.toEqual({
        AND: [{ user: { OR: [{ role: { not: 'admin' } }, { role: null }] } }],
      });
    });
  });
});
