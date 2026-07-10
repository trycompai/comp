import { describe, expect, it } from 'vitest';
import type { IsmsRole } from '../isms-types';
import { roleValidationMessages, teamSizeBand } from './roles-constants';

function role(overrides: Partial<IsmsRole>): IsmsRole {
  return {
    id: 'role_1',
    roleKey: null,
    name: 'Role',
    description: '',
    responsibilities: '',
    authorities: '',
    authorityGrantedBy: 'Top Management',
    requiredCompetence: '',
    auditRoute: null,
    auditRouteMemberId: null,
    auditFirmName: null,
    auditEvidenceRef: null,
    auditCourse: null,
    auditDueDate: null,
    source: 'derived',
    derivedFrom: null,
    position: 0,
    assignments: [],
    ...overrides,
  };
}

const withMember = { id: 'ra', roleId: 'role_1', memberId: 'mem_1' } as never;

describe('teamSizeBand', () => {
  it('treats 1-3 people as small and 4+ as standard', () => {
    expect(teamSizeBand(1)).toBe('small');
    expect(teamSizeBand(3)).toBe('small');
    expect(teamSizeBand(4)).toBe('standard');
  });
});

describe('roleValidationMessages', () => {
  const ACTIVE = new Set(['mem_1']);
  const fullyAssigned = (): IsmsRole[] => [
    role({ roleKey: 'top_management', name: 'Top Management', assignments: [withMember] }),
    role({ roleKey: 'spo', name: 'SPO', assignments: [withMember] }),
    role({ roleKey: 'deputy_spo', name: 'Deputy SPO', assignments: [withMember] }),
    role({
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: 'external',
      auditFirmName: 'Acme Audit LLP',
      auditEvidenceRef: 'LA cert on file',
      assignments: [withMember],
    }),
  ];

  it('returns no messages when every seeded role is satisfied', () => {
    expect(
      roleValidationMessages({ roles: fullyAssigned(), band: 'standard', activeMemberIds: ACTIVE }),
    ).toEqual([]);
  });

  it('flags a seeded role with no assigned member', () => {
    const roles = fullyAssigned();
    roles[0] = role({ roleKey: 'top_management', name: 'Top Management', assignments: [] });
    const messages = roleValidationMessages({ roles, band: 'standard', activeMemberIds: ACTIVE });
    expect(messages).toContain('Top Management needs at least one assigned member.');
  });

  it('does not count an assignment to a deactivated (non-active) member', () => {
    const roles = fullyAssigned();
    // top_management assigned only to mem_1, but mem_1 is NOT in the active set.
    const messages = roleValidationMessages({
      roles,
      band: 'standard',
      activeMemberIds: new Set(['someone_else']),
    });
    expect(messages).toContain('Top Management needs at least one assigned member.');
  });

  it('treats the Deputy SPO as optional in the small band only', () => {
    const roles = fullyAssigned();
    roles[2] = role({ roleKey: 'deputy_spo', name: 'Deputy SPO', assignments: [] });

    expect(roleValidationMessages({ roles, band: 'small', activeMemberIds: ACTIVE })).toEqual([]);
    expect(
      roleValidationMessages({ roles, band: 'standard', activeMemberIds: ACTIVE }),
    ).toContain('Deputy SPO needs at least one assigned member.');
  });

  it('requires the Internal Auditor to have a route', () => {
    const roles = fullyAssigned();
    roles[3] = role({
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: null,
      assignments: [withMember],
    });
    expect(
      roleValidationMessages({ roles, band: 'standard', activeMemberIds: ACTIVE }),
    ).toContain('The Internal Auditor needs an audit route selected.');
  });

  it('requires firm + evidence for the external audit route', () => {
    const roles = fullyAssigned();
    roles[3] = role({
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: 'external',
      assignments: [withMember],
    });
    expect(
      roleValidationMessages({ roles, band: 'standard', activeMemberIds: ACTIVE }),
    ).toContain(
      'The external Internal Auditor needs a firm/person name and an evidence reference.',
    );
  });

  it('does not require assigned members on custom roles', () => {
    const roles = [
      ...fullyAssigned(),
      role({ roleKey: null, name: 'Custom role', assignments: [] }),
    ];
    expect(
      roleValidationMessages({ roles, band: 'standard', activeMemberIds: ACTIVE }),
    ).toEqual([]);
  });

  it('flags an entirely-missing required seeded role (not just present ones)', () => {
    const roles = fullyAssigned().filter((r) => r.roleKey !== 'top_management');
    expect(
      roleValidationMessages({ roles, band: 'standard', activeMemberIds: ACTIVE }),
    ).toContain('Top Management is missing from the document.');
  });
});
