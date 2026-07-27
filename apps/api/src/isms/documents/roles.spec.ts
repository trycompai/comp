import {
  buildRolesSections,
  roleValidationMessages,
  seedRolesIfMissing,
  teamSizeBand,
  type RoleValidationRow,
} from './roles';
import type {
  DocumentExportInput,
  RoleExportRow,
  OperationalOwnershipRow,
} from './types';
import type { IsmsExportSection } from '../utils/export-shared';

function role(overrides: Partial<RoleExportRow>): RoleExportRow {
  return {
    roleKey: null,
    name: 'Custom role',
    description: 'desc',
    responsibilities: 'resp',
    authorities: 'auth',
    authorityGrantedBy: 'Top Management',
    requiredCompetence: 'comp',
    holders: [],
    auditRoute: null,
    auditRouteHolderName: null,
    auditFirmName: null,
    auditEvidenceRef: null,
    auditCourse: null,
    auditDueDate: null,
    ...overrides,
  };
}

const OWNERSHIP: OperationalOwnershipRow[] = [
  {
    artifact: 'Policies',
    assignedWhere: 'Policy assignee / approver in Comp AI',
    ownerResponsibility: 'Keep the policy current.',
    owners: ['Alice'],
  },
  {
    artifact: 'Controls',
    assignedWhere: 'Control owner in Comp AI',
    ownerResponsibility: 'Operate the control.',
    owners: [],
  },
];

function input(overrides: Partial<DocumentExportInput>): DocumentExportInput {
  return {
    contextIssues: [],
    interestedParties: [],
    requirements: [],
    objectives: [],
    narrative: null,
    roles: [],
    operationalOwnership: OWNERSHIP,
    band: 'standard',
    ...overrides,
  };
}

function findSection(
  sections: IsmsExportSection[],
  heading: string,
): IsmsExportSection | undefined {
  return sections.find((section) => section.heading === heading);
}

describe('teamSizeBand', () => {
  it.each([
    [0, 'small'],
    [1, 'small'],
    [3, 'small'],
    [4, 'standard'],
    [50, 'standard'],
  ])('maps %i members to %s', (count, band) => {
    expect(teamSizeBand(count)).toBe(band);
  });
});

describe('buildRolesSections', () => {
  it('renders a 6-row governance table (roles + 2 auto rows) with holders', () => {
    const sections = buildRolesSections(
      input({
        roles: [
          role({ roleKey: 'top_management', name: 'Top Management', holders: ['Raoul'] }),
          role({ roleKey: 'spo', name: 'SPO', holders: ['Alex'] }),
        ],
      }),
    );
    const table = findSection(sections, 'ISMS governance roles')?.table;
    expect(table?.headers).toHaveLength(4);
    // 2 provided roles + 2 auto-generated rows
    expect(table?.rows).toHaveLength(4);
    expect(table?.rows[0][1]).toBe('Raoul'); // holder column
    expect(table?.rows.some((r) => r[0] === 'Control / asset / risk / policy owners')).toBe(true);
    expect(table?.rows.some((r) => r[0] === 'All personnel and contractors')).toBe(true);
  });

  it('shows [To be named] when a role has no holders', () => {
    const sections = buildRolesSections(
      input({ roles: [role({ roleKey: 'spo', name: 'SPO', holders: [] })] }),
    );
    const table = findSection(sections, 'ISMS governance roles')?.table;
    expect(table?.rows[0][1]).toBe('[To be named]');
  });

  it('assigns 5.3(a) and (b) to the SPO holder in prose', () => {
    const sections = buildRolesSections(
      input({ roles: [role({ roleKey: 'spo', name: 'SPO', holders: ['Alex Petrisor'] })] }),
    );
    const assignments = findSection(sections, 'Specific assignments required by Clause 5.3');
    const paragraphs = assignments?.paragraphs ?? [];
    expect(paragraphs.find((p) => p.text.startsWith('(a)'))?.text).toContain('Alex Petrisor');
    expect(paragraphs.find((p) => p.text.startsWith('(b)'))?.text).toContain('Alex Petrisor');
  });

  it('describes the chosen internal audit route (external)', () => {
    const sections = buildRolesSections(
      input({
        roles: [
          role({
            roleKey: 'internal_auditor',
            name: 'Internal Auditor',
            auditRoute: 'external',
            auditFirmName: 'Acme Audit LLP',
          }),
        ],
      }),
    );
    const text = findSection(sections, 'Internal audit route')?.paragraphs?.[0].text ?? '';
    expect(text).toContain('external independent auditor');
    expect(text).toContain('Acme Audit LLP');
  });

  it('renders the team-size note and a summary ONLY for the small band', () => {
    const small = buildRolesSections(input({ band: 'small' }));
    expect(findSection(small, 'Note on team size')).toBeDefined();
    // Operational responsibilities are a bulleted summary in the small band.
    const smallOps = findSection(small, 'Operational responsibilities');
    expect(smallOps?.bullets).toBeDefined();
    expect(smallOps?.table).toBeUndefined();

    const standard = buildRolesSections(input({ band: 'standard' }));
    expect(findSection(standard, 'Note on team size')).toBeUndefined();
    // ...and a 4-column table in the standard band, surfacing live owners.
    const stdOps = findSection(standard, 'Operational responsibilities');
    expect(stdOps?.table?.headers).toHaveLength(4);
    expect(stdOps?.table?.rows[0]).toContain('Alice');
  });
});

describe('roleValidationMessages (server gate)', () => {
  const ACTIVE = new Set(['m1']);
  const assigned = { memberId: 'm1' };
  const check = (roles: RoleValidationRow[], memberCount = 20) =>
    roleValidationMessages({ roles, memberCount, activeMemberIds: ACTIVE });
  const externalAuditor: RoleValidationRow = {
    roleKey: 'internal_auditor',
    name: 'Internal Auditor',
    auditRoute: 'external',
    auditFirmName: 'Acme Audit LLP',
    auditEvidenceRef: 'LA cert on file',
    assignments: [assigned],
  };
  const complete = (): RoleValidationRow[] => [
    { roleKey: 'top_management', name: 'Top Management', auditRoute: null, assignments: [assigned] },
    { roleKey: 'spo', name: 'SPO', auditRoute: null, assignments: [assigned] },
    { roleKey: 'deputy_spo', name: 'Deputy SPO', auditRoute: null, assignments: [assigned] },
    { ...externalAuditor },
  ];

  it('passes when every seeded role is present + assigned + routed', () => {
    expect(check(complete())).toEqual([]);
  });

  it('does not count an assignment to a non-active member', () => {
    const roles = complete();
    roles[0] = {
      roleKey: 'top_management',
      name: 'Top Management',
      auditRoute: null,
      assignments: [{ memberId: 'deactivated' }],
    };
    expect(check(roles)).toContain('Top Management needs at least one assigned member.');
  });

  it('requires firm + evidence for the external audit route (whitespace does not count)', () => {
    const roles = complete();
    roles[3] = {
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: 'external',
      auditFirmName: '   ',
      auditEvidenceRef: '',
      assignments: [assigned],
    };
    expect(check(roles)).toContain(
      'The external Internal Auditor needs a firm/person name and an evidence reference.',
    );
  });

  it('requires an ACTIVE member for the in-house audit route', () => {
    const roles = complete();
    roles[3] = {
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: 'in_house',
      auditRouteMemberId: 'deactivated', // set, but not in the active set
      assignments: [assigned],
    };
    expect(check(roles)).toContain(
      'The in-house Internal Auditor needs an active member selected.',
    );
  });

  it('requires active member + course + due date for the training-planned route', () => {
    const roles = complete();
    roles[3] = {
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: 'training_planned',
      auditRouteMemberId: 'm1', // active
      auditCourse: '   ', // whitespace → missing
      auditDueDate: '2026-05-26',
      assignments: [assigned],
    };
    expect(check(roles)).toContain(
      'The training-planned Internal Auditor needs an active member, a course, and a due date.',
    );
  });

  it('flags an entirely-missing required seeded role', () => {
    const roles = complete().filter((r) => r.roleKey !== 'top_management');
    expect(check(roles)).toContain('Top Management is missing from the document.');
  });

  it('flags a present-but-unassigned seeded role', () => {
    const roles = complete();
    roles[1] = { roleKey: 'spo', name: 'SPO', auditRoute: null, assignments: [] };
    expect(check(roles)).toContain('SPO needs at least one assigned member.');
  });

  it('treats Deputy SPO as optional only in the small band', () => {
    const roles = complete().filter((r) => r.roleKey !== 'deputy_spo');
    expect(check(roles, 2)).toEqual([]);
    expect(check(roles, 10)).toContain(
      'Deputy Security & Privacy Owner is missing from the document.',
    );
  });

  it('requires the Internal Auditor route', () => {
    const roles = complete();
    roles[3] = {
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: null,
      assignments: [assigned],
    };
    expect(check(roles)).toContain('The Internal Auditor needs an audit route selected.');
  });
});

describe('seedRolesIfMissing', () => {
  function makeTx(existingRoleKeys: Array<string | null>) {
    return {
      ismsRole: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            existingRoleKeys.map((roleKey, i) => ({ roleKey, position: i })),
          ),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
  }

  it('creates all four seeded roles on an empty document', async () => {
    const tx = makeTx([]);
    await seedRolesIfMissing({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx: tx as any,
      documentId: 'doc_1',
      memberCount: 10,
    });
    const created = tx.ismsRole.createMany.mock.calls[0][0].data;
    expect(created).toHaveLength(4);
    expect(created.map((r: { roleKey: string }) => r.roleKey)).toEqual([
      'top_management',
      'spo',
      'deputy_spo',
      'internal_auditor',
    ]);
  });

  it('is idempotent: creates nothing when all seeded roles exist', async () => {
    const tx = makeTx(['top_management', 'spo', 'deputy_spo', 'internal_auditor']);
    await seedRolesIfMissing({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx: tx as any,
      documentId: 'doc_1',
      memberCount: 10,
    });
    expect(tx.ismsRole.createMany).not.toHaveBeenCalled();
  });

  it('defaults the Internal Auditor route to external for a small team', async () => {
    const tx = makeTx([]);
    await seedRolesIfMissing({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx: tx as any,
      documentId: 'doc_1',
      memberCount: 2,
    });
    const created = tx.ismsRole.createMany.mock.calls[0][0].data as Array<{
      roleKey: string;
      auditRoute: string | null;
    }>;
    const auditor = created.find((r) => r.roleKey === 'internal_auditor');
    expect(auditor?.auditRoute).toBe('external');
  });

  it('leaves the Internal Auditor route unset for a standard team', async () => {
    const tx = makeTx([]);
    await seedRolesIfMissing({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tx: tx as any,
      documentId: 'doc_1',
      memberCount: 20,
    });
    const created = tx.ismsRole.createMany.mock.calls[0][0].data as Array<{
      roleKey: string;
      auditRoute: string | null;
    }>;
    const auditor = created.find((r) => r.roleKey === 'internal_auditor');
    expect(auditor?.auditRoute).toBeNull();
  });
});
