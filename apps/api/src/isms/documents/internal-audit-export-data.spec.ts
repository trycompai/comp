import {
  loadInternalAuditExtras,
  mapAudits,
  type AuditWithExportIncludes,
} from './internal-audit-export-data';

jest.mock('@db', () => ({ db: {} }));

const extras = {
  memberNames: { mem_1: 'Alex Petrisor', mem_2: 'jane@acme.io' },
};

const baseAudit = {
  id: 'aud_1',
  documentId: 'doc_1',
  reference: 'IA-2026-01',
  scope: 'The whole ISMS.',
  criteria: 'ISO/IEC 27001:2022 and the SoA.',
  auditorName: 'Sarah Chen, Assured Compliance Ltd',
  plannedStartDate: new Date('2026-05-15T00:00:00.000Z'),
  plannedEndDate: new Date('2026-05-20T00:00:00.000Z'),
  status: 'complete',
  conclusionVerdict: 'substantially_conform',
  conclusionNotes: 'Ready for Stage 2.',
  signoffAuditorName: 'Sarah Chen',
  signoffAuditorDate: new Date('2026-05-20T00:00:00.000Z'),
  signoffSpoName: null,
  signoffSpoDate: null,
  signoffTopMgmtName: null,
  signoffTopMgmtDate: null,
  position: 0,
  controls: [
    {
      id: 'ac_1',
      controlRef: 'Clause 6.1 Risk',
      whatWasTested: 'Whether risks are identified and treated.',
      whereToFind: 'Comp AI > Risks (risk register)',
      result: 'observation_raised',
      notes: 'See F-03.',
    },
    {
      id: 'ac_2',
      controlRef: 'A.8.24 Cryptography',
      whatWasTested: 'Whether crypto rules are applied.',
      whereToFind: 'Comp AI > Policies > Encryption & Crypto Controls',
      result: null,
      notes: null,
    },
  ],
  findings: [
    {
      id: 'af_1',
      reference: 'F-01',
      type: 'nc_minor',
      clauseOrControl: 'Clause 9.1 (Monitoring)',
      description: 'Three metrics unmeasured for 90 days.',
      ownerMemberId: 'mem_1',
      dueDate: new Date('2026-06-15T00:00:00.000Z'),
      status: 'open',
      closureEvidence: null,
    },
    {
      id: 'af_2',
      reference: 'F-02',
      type: 'ofi',
      clauseOrControl: null,
      description: 'Document the quarterly access review.',
      ownerMemberId: 'mem_gone',
      dueDate: null,
      status: 'in_progress',
      closureEvidence: null,
    },
  ],
} as unknown as AuditWithExportIncludes;

describe('mapAudits', () => {
  it('maps an audit with humanized labels, dates and the conclusion sentence', () => {
    const [row] = mapAudits([baseAudit], extras);

    expect(row.reference).toBe('IA-2026-01');
    expect(row.status).toBe('Complete');
    expect(row.plannedStartDate).toBe('2026-05-15');
    expect(row.plannedEndDate).toBe('2026-05-20');
    expect(row.conclusion).toBe(
      'Overall, this audit found the ISMS to substantially conform with the non-conformities recorded below to ISO/IEC 27001:2022. Corrective actions are tracked in the findings table.',
    );
    expect(row.conclusionNotes).toBe('Ready for Stage 2.');
  });

  it('maps control rows, dashing an unset result', () => {
    const [row] = mapAudits([baseAudit], extras);
    expect(row.controls).toEqual([
      {
        controlRef: 'Clause 6.1 Risk',
        whatWasTested: 'Whether risks are identified and treated.',
        whereToFind: 'Comp AI > Risks (risk register)',
        result: 'Observation raised',
        notes: 'See F-03.',
      },
      {
        controlRef: 'A.8.24 Cryptography',
        whatWasTested: 'Whether crypto rules are applied.',
        whereToFind: 'Comp AI > Policies > Encryption & Crypto Controls',
        result: '—',
        notes: '',
      },
    ]);
  });

  it('resolves finding owners, falling back for removed members', () => {
    const [row] = mapAudits([baseAudit], extras);
    expect(row.findings[0]).toMatchObject({
      reference: 'F-01',
      type: 'NC minor',
      ownerName: 'Alex Petrisor',
      dueDate: '2026-06-15',
      status: 'Open',
    });
    expect(row.findings[1]).toMatchObject({
      type: 'OFI',
      ownerName: 'Former member',
      dueDate: '',
      status: 'In progress',
    });
  });

  it('builds the three fixed sign-off slots in reference-document order', () => {
    const [row] = mapAudits([baseAudit], extras);
    expect(row.signoffs).toEqual([
      { role: 'Auditor', name: 'Sarah Chen', date: '2026-05-20' },
      { role: 'Information Security Manager / SPO', name: '', date: '' },
      { role: 'Top Management', name: '', date: '' },
    ]);
  });

  it('renders a null conclusion while no verdict is chosen', () => {
    const [row] = mapAudits(
      [
        {
          ...baseAudit,
          conclusionVerdict: null,
        } as unknown as AuditWithExportIncludes,
      ],
      extras,
    );
    expect(row.conclusion).toBeNull();
  });
});

describe('loadInternalAuditExtras', () => {
  it('resolves member display names with the name → email → placeholder fallback', async () => {
    const client = {
      member: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'mem_1', user: { name: 'Alex Petrisor', email: 'a@x.io' } },
          { id: 'mem_2', user: { name: null, email: 'jane@acme.io' } },
          { id: 'mem_3', user: null },
        ]),
      },
    };

    const result = await loadInternalAuditExtras({
      organizationId: 'org_1',
      client: client as never,
    });

    expect(client.member.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_1' },
      select: { id: true, user: { select: { name: true, email: true } } },
    });
    expect(result.memberNames).toEqual({
      mem_1: 'Alex Petrisor',
      mem_2: 'jane@acme.io',
      mem_3: 'Unknown member',
    });
  });
});
