import { buildRolesSections, seedRolesIfMissing, teamSizeBand } from './roles';
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
