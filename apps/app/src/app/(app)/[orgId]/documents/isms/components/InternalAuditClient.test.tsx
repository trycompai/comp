import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { IsmsAudit, IsmsDocument, IsmsDriftResult } from '../isms-types';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

// ─── Mock usePermissions ─────────────────────────────────────
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ permissions: {}, hasPermission: mockHasPermission }),
}));

// ─── Mock the ISMS document hook ─────────────────────────────
const hookState: {
  document: IsmsDocument | null;
  drift: IsmsDriftResult;
} = {
  document: null,
  drift: { isStale: false, changedSources: [] },
};

const mockCreateRow = vi.fn().mockResolvedValue(undefined);
const mockUpdateRow = vi.fn().mockResolvedValue(undefined);
const mockDeleteRow = vi.fn().mockResolvedValue(undefined);
const mockSaveNarrative = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useIsmsDocument', () => ({
  useIsmsDocument: () => ({
    document: hookState.document,
    isExporting: false,
    generate: vi.fn().mockResolvedValue(undefined),
    createRow: mockCreateRow,
    updateRow: mockUpdateRow,
    deleteRow: mockDeleteRow,
    saveNarrative: mockSaveNarrative,
    submitForApproval: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    decline: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    handleExport: vi.fn().mockResolvedValue(undefined),
  }),
}));

// ─── Mock SWR (drift) + api client ───────────────────────────
vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));

vi.mock('swr', () => ({
  default: () => ({ data: hookState.drift, mutate: vi.fn().mockResolvedValue(undefined) }),
}));

// ─── Mock design system + icons + shared components ──────────
vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('./IsmsControlMappings', () => ({
  IsmsControlMappings: () => <div data-testid="isms-control-mappings" />,
}));

vi.mock('./IsmsVersionHistory', () => ({
  IsmsVersionHistory: () => <div data-testid="isms-version-history" />,
}));

import { InternalAuditClient } from './InternalAuditClient';

function makeAudit(overrides: Partial<IsmsAudit> = {}): IsmsAudit {
  return {
    id: 'aud_1',
    reference: 'IA-2026-01',
    scope: 'The whole ISMS as defined in the ISMS Scope Statement (Clause 4.3).',
    criteria: 'ISO/IEC 27001:2022 and the Statement of Applicability.',
    auditorName: 'Sarah Chen, Assured Compliance Ltd',
    plannedStartDate: '2026-05-15T00:00:00.000Z',
    plannedEndDate: '2026-05-20T00:00:00.000Z',
    status: 'complete',
    conclusionVerdict: 'substantially_conform',
    conclusionNotes: null,
    signoffAuditorName: 'Sarah Chen',
    signoffAuditorDate: '2026-05-20T00:00:00.000Z',
    signoffSpoName: null,
    signoffSpoDate: null,
    signoffTopMgmtName: null,
    signoffTopMgmtDate: null,
    position: 0,
    controls: [
      {
        id: 'ac_1',
        auditId: 'aud_1',
        controlKey: 'clause_9_1_monitoring',
        controlRef: 'Clause 9.1 Monitoring',
        whatWasTested: 'Whether info-security performance is being measured.',
        whereToFind: 'Comp AI > ISMS > Monitoring',
        result: 'nonconformity_raised',
        notes: 'Three metrics overdue. See F-01.',
        source: 'derived',
        derivedFrom: 'seed:clause_9_1_monitoring',
        position: 0,
      },
      {
        id: 'ac_2',
        auditId: 'aud_1',
        controlKey: 'a_8_13_backup',
        controlRef: 'A.8.13 Backup',
        whatWasTested: 'Whether backups are taken and tested.',
        whereToFind: "Comp AI > Evidence tasks tagged 'backup'",
        result: null,
        notes: null,
        source: 'derived',
        derivedFrom: 'seed:a_8_13_backup',
        position: 1,
      },
    ],
    findings: [
      {
        id: 'af_1',
        auditId: 'aud_1',
        reference: 'F-01',
        type: 'nc_minor',
        controlId: 'ac_1',
        clauseOrControl: 'Clause 9.1 (Monitoring)',
        description: 'Three of nine metrics have no measurement in 90 days.',
        ownerMemberId: 'm2',
        dueDate: '2026-06-15T00:00:00.000Z',
        status: 'open',
        closureEvidence: null,
        position: 0,
      },
    ],
    ...overrides,
  };
}

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'internal_audit',
    status: 'draft',
    title: 'Internal Audit',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: [],
    roles: [],
    metrics: [],
    audits: [makeAudit()],
    reviews: [],
    controlLinks: [],
    draftNarrative: {
      programme: 'Acme runs an annual internal audit of the whole ISMS.',
    },
    currentVersionId: null,
    currentVersion: null,
    ...overrides,
  };
}

const baseProps = {
  organizationId: 'org-1',
  documentId: 'd1',
  fallbackData: null,
  currentMemberId: 'm1',
  approverOptions: [{ id: 'm2', name: 'Approver Two' }],
  memberOptions: [
    { id: 'm1', name: 'Member One' },
    { id: 'm2', name: 'Approver Two' },
  ],
  auditorOptions: ['Sarah Chen, Assured Compliance Ltd'],
};

describe('InternalAuditClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders the programme paragraph and the audit with its plan fields', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InternalAuditClient {...baseProps} />);

    expect(
      screen.getByText('Acme runs an annual internal audit of the whole ISMS.'),
    ).toBeInTheDocument();
    expect(screen.getByText('IA-2026-01')).toBeInTheDocument();
    expect(
      screen.getByText('The whole ISMS as defined in the ISMS Scope Statement (Clause 4.3).'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sarah Chen, Assured Compliance Ltd'),
    ).toBeInTheDocument();
    // The assembled conclusion sentence renders in the read view.
    expect(
      screen.getByText(/substantially conform with the non-conformities recorded below/),
    ).toBeInTheDocument();
  });

  it('renders the Controls Tested table with results and notes', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InternalAuditClient {...baseProps} />);

    expect(screen.getByText('Controls Tested')).toBeInTheDocument();
    // Appears in the table and again as the finding's related control.
    expect(screen.getAllByText('Clause 9.1 Monitoring').length).toBeGreaterThan(0);
    expect(screen.getByText('A.8.13 Backup')).toBeInTheDocument();
    expect(screen.getByText('Comp AI > ISMS > Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Three metrics overdue. See F-01.')).toBeInTheDocument();
  });

  it('renders findings with type, owner and linked control', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InternalAuditClient {...baseProps} />);

    expect(screen.getByText('F-01')).toBeInTheDocument();
    expect(screen.getByText('NC minor')).toBeInTheDocument();
    expect(
      screen.getByText('Three of nine metrics have no measurement in 90 days.'),
    ).toBeInTheDocument();
    // Owner resolved from memberOptions.
    expect(screen.getAllByText('Approver Two').length).toBeGreaterThan(0);
  });

  it('renders the three sign-off slots with the signed count', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InternalAuditClient {...baseProps} />);

    expect(screen.getByText('Sign-off')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 signed')).toBeInTheDocument();
    expect(screen.getByLabelText('Auditor signatory name')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Top Management signatory name'),
    ).toBeInTheDocument();
  });

  it('allows editing for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InternalAuditClient {...baseProps} />);

    expect(screen.getByText('New audit')).toBeInTheDocument();
    expect(screen.getByText('Add control row')).toBeInTheDocument();
    expect(screen.getByText('Add finding')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit audit IA-2026-01')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete audit IA-2026-01')).toBeInTheDocument();
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<InternalAuditClient {...baseProps} />);

    expect(screen.queryByText('New audit')).not.toBeInTheDocument();
    expect(screen.queryByText('Add control row')).not.toBeInTheDocument();
    expect(screen.queryByText('Add finding')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit audit IA-2026-01')).not.toBeInTheDocument();
    expect(screen.queryByText('Save sign-off')).not.toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('warns when no audit is recorded (clause 9.2 gate)', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({ audits: [] });
    render(<InternalAuditClient {...baseProps} />);

    expect(
      screen.getAllByText(/At least one internal audit must be recorded\./).length,
    ).toBeGreaterThan(0);
    // Empty state invites creating the first audit.
    expect(screen.getByText('No audits yet')).toBeInTheDocument();
  });

  it('warns when a completed audit has no conclusion verdict', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({
      audits: [makeAudit({ conclusionVerdict: null })],
    });
    render(<InternalAuditClient {...baseProps} />);

    expect(
      screen.getAllByText(/IA-2026-01 is complete but has no conclusion verdict\./)
        .length,
    ).toBeGreaterThan(0);
  });
});
