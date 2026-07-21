import type { Prisma } from '@db';
import {
  auditValidationMessages,
  buildInternalAuditSections,
  deriveInternalAuditNarrative,
  seedAuditControlsIfMissing,
} from './internal-audit';
import { SEED_AUDIT_CONTROL_DEFINITIONS } from './internal-audit-defaults';
import type { AuditExportRow, DocumentExportInput, IsmsPlatformData } from './types';

const baseInput: DocumentExportInput = {
  contextIssues: [],
  interestedParties: [],
  requirements: [],
  objectives: [],
  narrative: { programme: 'Acme runs an annual internal audit of the whole ISMS.' },
};

const audit: AuditExportRow = {
  reference: 'IA-2026-01',
  scope: 'The whole ISMS as defined in the ISMS Scope Statement (Clause 4.3).',
  criteria: 'ISO/IEC 27001:2022 and the Statement of Applicability.',
  auditorName: 'Sarah Chen, Assured Compliance Ltd',
  plannedStartDate: '2026-05-15',
  plannedEndDate: '2026-05-20',
  status: 'Complete',
  conclusion:
    'Overall, this audit found the ISMS to substantially conform with the non-conformities recorded below to ISO/IEC 27001:2022. Corrective actions are tracked in the findings table.',
  conclusionNotes: null,
  controls: [
    {
      controlRef: 'Clause 9.1 Monitoring',
      whatWasTested: 'Whether info-security performance is being measured.',
      whereToFind: 'Comp AI > ISMS > Monitoring',
      result: 'Non-conformity raised',
      notes: 'Three metrics overdue. See F-01.',
    },
  ],
  findings: [
    {
      reference: 'F-01',
      type: 'NC minor',
      clauseOrControl: 'Clause 9.1 (Monitoring)',
      description: 'Three of nine metrics have no measurement in 90 days.',
      ownerName: 'Alex Petrisor',
      dueDate: '2026-06-15',
      status: 'Open',
    },
  ],
  signoffs: [
    { role: 'Auditor', name: 'Sarah Chen', date: '2026-05-20' },
    { role: 'Information Security Manager / SPO', name: '', date: '' },
    { role: 'Top Management', name: 'Raoul Plickat', date: '2026-05-22' },
  ],
};

describe('auditValidationMessages (clause 9.2 submit gate)', () => {
  it('requires at least one audit', () => {
    expect(auditValidationMessages({ audits: [] })).toEqual([
      'At least one internal audit must be recorded.',
    ]);
  });

  it('requires a conclusion verdict on completed audits only', () => {
    const messages = auditValidationMessages({
      audits: [
        { reference: 'IA-2026-01', status: 'complete', conclusionVerdict: null },
        { reference: 'IA-2026-02', status: 'in_progress', conclusionVerdict: null },
      ],
    });
    expect(messages).toEqual([
      'Audit IA-2026-01 is complete but has no conclusion verdict.',
    ]);
  });

  it('passes with a planned audit or a concluded complete audit', () => {
    expect(
      auditValidationMessages({
        audits: [
          { reference: 'IA-2026-01', status: 'planned', conclusionVerdict: null },
        ],
      }),
    ).toEqual([]);
    expect(
      auditValidationMessages({
        audits: [
          {
            reference: 'IA-2026-01',
            status: 'complete',
            conclusionVerdict: 'conform',
          },
        ],
      }),
    ).toEqual([]);
  });
});

describe('deriveInternalAuditNarrative', () => {
  it('templates the programme paragraph with the organization name', () => {
    const narrative = deriveInternalAuditNarrative({
      organizationName: 'Acme Corp',
    } as IsmsPlatformData);
    expect(narrative.programme).toContain('Acme Corp runs an annual internal audit');
    expect(narrative.programme).toContain('ISO/IEC 27001:2022');
  });
});

describe('seedAuditControlsIfMissing', () => {
  const makeTx = (
    existing: Array<{ controlKey: string | null; position: number }>,
  ) => {
    const tx = {
      ismsAuditControl: {
        findMany: jest.fn().mockResolvedValue(existing),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    return tx as unknown as Prisma.TransactionClient & typeof tx;
  };

  it('seeds all fifteen defaults into a new audit', async () => {
    const tx = makeTx([]);
    await seedAuditControlsIfMissing({
      tx,
      auditId: 'aud_1',
      documentId: 'doc_1',
    });

    const { data, skipDuplicates } = (
      tx.ismsAuditControl.createMany as jest.Mock
    ).mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data).toHaveLength(15);
    expect(data.map((row: { controlKey: string }) => row.controlKey)).toEqual(
      SEED_AUDIT_CONTROL_DEFINITIONS.map((control) => control.controlKey),
    );
    expect(data[0]).toMatchObject({
      auditId: 'aud_1',
      documentId: 'doc_1',
      source: 'derived',
      derivedFrom: `seed:${SEED_AUDIT_CONTROL_DEFINITIONS[0].controlKey}`,
      position: 0,
    });
    // Result deliberately unset: the auditor records it per row.
    expect(data[0].result).toBeUndefined();
  });

  it('creates only the missing seeds, after existing positions', async () => {
    const tx = makeTx([
      { controlKey: 'clause_4_1_context', position: 0 },
      { controlKey: null, position: 20 }, // custom row
    ]);
    await seedAuditControlsIfMissing({
      tx,
      auditId: 'aud_1',
      documentId: 'doc_1',
    });

    const { data } = (tx.ismsAuditControl.createMany as jest.Mock).mock
      .calls[0][0];
    expect(data).toHaveLength(14);
    expect(
      data.map((row: { controlKey: string }) => row.controlKey),
    ).not.toContain('clause_4_1_context');
    expect(data[0].position).toBe(21);
  });

  it('is a no-op when every seed already exists (never deletes/overwrites)', async () => {
    const tx = makeTx(
      SEED_AUDIT_CONTROL_DEFINITIONS.map((control, index) => ({
        controlKey: control.controlKey,
        position: index,
      })),
    );
    await seedAuditControlsIfMissing({
      tx,
      auditId: 'aud_1',
      documentId: 'doc_1',
    });
    expect(tx.ismsAuditControl.createMany).not.toHaveBeenCalled();
  });
});

describe('buildInternalAuditSections', () => {
  it('renders the reference-document sections in order for a single audit', () => {
    const sections = buildInternalAuditSections({
      ...baseInput,
      audits: [audit],
    });
    expect(sections.map((section) => section.heading)).toEqual([
      'Purpose',
      'Programme',
      'Audit plan',
      'Controls Tested',
      'Findings',
      'Conclusion',
      'Sign-off',
    ]);
  });

  it('suffixes per-audit headings with the reference when several audits exist', () => {
    const sections = buildInternalAuditSections({
      ...baseInput,
      audits: [audit, { ...audit, reference: 'IA-2027-01' }],
    });
    const headings = sections.map((section) => section.heading);
    expect(headings).toContain('Audit plan — IA-2026-01');
    expect(headings).toContain('Sign-off — IA-2027-01');
  });

  it('renders the programme paragraph verbatim and an empty-audits placeholder', () => {
    const sections = buildInternalAuditSections({ ...baseInput, audits: [] });
    expect(sections[1].paragraphs?.[0]?.text).toBe(
      'Acme runs an annual internal audit of the whole ISMS.',
    );
    expect(sections[2].heading).toBe('Audits');
    expect(sections[2].emptyText).toBe('No internal audits recorded yet.');
  });

  it('shows a programme placeholder when the narrative is missing or invalid', () => {
    const sections = buildInternalAuditSections({
      ...baseInput,
      narrative: null,
      audits: [],
    });
    expect(sections[1].emptyText).toBe('No audit programme recorded.');
  });

  it('renders the audit plan as label/value rows', () => {
    const sections = buildInternalAuditSections({
      ...baseInput,
      audits: [audit],
    });
    expect(sections[2].keyValues).toEqual([
      { label: 'Reference', value: 'IA-2026-01' },
      {
        label: 'Scope',
        value:
          'The whole ISMS as defined in the ISMS Scope Statement (Clause 4.3).',
      },
      {
        label: 'Criteria',
        value: 'ISO/IEC 27001:2022 and the Statement of Applicability.',
      },
      { label: 'Auditor', value: 'Sarah Chen, Assured Compliance Ltd' },
      { label: 'Planned start date', value: '2026-05-15' },
      { label: 'Planned end date', value: '2026-05-20' },
      { label: 'Status', value: 'Complete' },
    ]);
  });

  it('renders the five-column Controls Tested table', () => {
    const sections = buildInternalAuditSections({
      ...baseInput,
      audits: [audit],
    });
    const table = sections[3].table;
    expect(table?.headers).toEqual([
      'Control reference',
      'What was tested',
      'Where to find it',
      'Result',
      'Notes',
    ]);
    expect(table?.rows).toEqual([
      [
        'Clause 9.1 Monitoring',
        'Whether info-security performance is being measured.',
        'Comp AI > ISMS > Monitoring',
        'Non-conformity raised',
        'Three metrics overdue. See F-01.',
      ],
    ]);
  });

  it('renders the seven-column findings table, or "No findings raised."', () => {
    const withFindings = buildInternalAuditSections({
      ...baseInput,
      audits: [audit],
    });
    expect(withFindings[4].table?.headers).toEqual([
      'Ref',
      'Type',
      'Clause / control',
      'Description',
      'Owner',
      'Due date',
      'Status',
    ]);

    const noFindings = buildInternalAuditSections({
      ...baseInput,
      audits: [{ ...audit, findings: [] }],
    });
    expect(noFindings[4].emptyText).toBe('No findings raised.');
    expect(noFindings[4].table).toBeUndefined();
    // No intro either: the renderers show emptyText only for empty sections.
    expect(noFindings[4].intro).toBeUndefined();
  });

  it('renders the conclusion sentence plus notes, or a placeholder', () => {
    const withNotes = buildInternalAuditSections({
      ...baseInput,
      audits: [{ ...audit, conclusionNotes: 'Ready for Stage 2.' }],
    });
    expect(withNotes[5].paragraphs?.map((paragraph) => paragraph.text)).toEqual([
      audit.conclusion,
      'Ready for Stage 2.',
    ]);

    const noVerdict = buildInternalAuditSections({
      ...baseInput,
      audits: [{ ...audit, conclusion: null, conclusionNotes: null }],
    });
    expect(noVerdict[5].emptyText).toBe('No conclusion recorded yet.');
  });

  it('renders the three sign-off slots with dashes for unsigned slots', () => {
    const sections = buildInternalAuditSections({
      ...baseInput,
      audits: [audit],
    });
    expect(sections[6].table?.headers).toEqual(['Role', 'Signatory', 'Date']);
    expect(sections[6].table?.rows).toEqual([
      ['Auditor', 'Sarah Chen', '2026-05-20'],
      ['Information Security Manager / SPO', '—', '—'],
      ['Top Management', 'Raoul Plickat', '2026-05-22'],
    ]);
  });
});
