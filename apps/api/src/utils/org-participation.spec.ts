jest.mock('@db', () => ({
  db: { organization: { findUnique: jest.fn() } },
  Prisma: {},
}));

import { db } from '@db';
import {
  getOrgIsInternal,
  isMemberOrgParticipant,
  orgParticipantMemberWhere,
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

  describe('orgParticipantMemberWhere', () => {
    it('returns an empty fragment for internal orgs (no exclusion)', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: true });
      await expect(orgParticipantMemberWhere('org_1')).resolves.toEqual({});
    });

    it('excludes platform admins but keeps owner-admins for customer orgs', async () => {
      orgFindUnique.mockResolvedValue({ isInternal: false });
      await expect(orgParticipantMemberWhere('org_1')).resolves.toEqual({
        OR: [
          { user: { role: { not: 'admin' } } },
          { role: { contains: 'owner' } },
        ],
      });
    });
  });
});
