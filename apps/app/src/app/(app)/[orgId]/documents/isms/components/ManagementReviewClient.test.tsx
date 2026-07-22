import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type {
  IsmsDocument,
  IsmsDriftResult,
  IsmsManagementReview,
} from '../isms-types';
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

import { ManagementReviewClient } from './ManagementReviewClient';

function makeReview(
  overrides: Partial<IsmsManagementReview> = {},
): IsmsManagementReview {
  return {
    id: 'mr_1',
    reference: 'MR-2026-01',
    meetingDate: '2026-05-01T00:00:00.000Z',
    recordedAt: '2026-05-01T09:30:00.000Z',
    chairName: 'Raoul Plickat (CEO)',
    attendees: [
      { memberId: 'm1', name: 'Member One' },
      { memberId: 'm2', name: 'Approver Two' },
    ],
    status: 'complete',
    conclusionVerdict: 'effective',
    conclusionNotes: null,
    decisionsText: 'Two improvements agreed at this review.',
    changesText: 'No changes to the ISMS were agreed at this review.',
    signoffChairName: 'Raoul Plickat',
    signoffChairDate: '2026-05-01T00:00:00.000Z',
    position: 0,
    inputs: [
      {
        id: 'mri_1',
        reviewId: 'mr_1',
        inputKey: 'a_prior_actions',
        inputRef: '(a) Prior actions',
        whatItCovers: 'Status of actions from previous management reviews.',
        whereToFind: 'Comp AI > ISMS > Management Review',
        discussionNotes: 'First review — no prior actions.',
        discussed: true,
        source: 'derived',
        derivedFrom: 'seed:a_prior_actions',
        position: 0,
      },
      {
        id: 'mri_2',
        reviewId: 'mr_1',
        inputKey: 'f_risk_assessment',
        inputRef: '(f) Risk assessment',
        whatItCovers: 'Results of risk assessment and treatment status.',
        whereToFind: 'Comp AI > Risks (risk register)',
        discussionNotes: null,
        discussed: true,
        source: 'derived',
        derivedFrom: 'seed:f_risk_assessment',
        position: 1,
      },
    ],
    actions: [
      {
        id: 'mra_1',
        reviewId: 'mr_1',
        reference: 'A01',
        description: 'Formalise a quarterly access review process.',
        ownerMemberId: 'm2',
        dueDate: '2026-06-30T00:00:00.000Z',
        status: 'open',
        position: 0,
      },
    ],
    ...overrides,
  };
}

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'management_review',
    status: 'draft',
    title: 'Management Review',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: [],
    roles: [],
    metrics: [],
    audits: [],
    reviews: [makeReview()],
    controlLinks: [],
    draftNarrative: {
      procedure: 'Acme holds a management review of the ISMS at least annually.',
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
  chairOptions: ['Raoul Plickat (CEO)'],
};

describe('ManagementReviewClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders the procedure paragraph and the review with its details', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ManagementReviewClient {...baseProps} />);

    expect(
      screen.getByText('Acme holds a management review of the ISMS at least annually.'),
    ).toBeInTheDocument();
    expect(screen.getByText('MR-2026-01')).toBeInTheDocument();
    expect(screen.getByText('Raoul Plickat (CEO)')).toBeInTheDocument();
    // The immutable recorded-on date renders with its guardrail caption.
    expect(
      screen.getByText(/2026-05-01 — set by the platform, cannot be edited/),
    ).toBeInTheDocument();
    // The assembled conclusion sentence renders in the read view.
    expect(
      screen.getByText(/found to be effective and no changes are required/),
    ).toBeInTheDocument();
  });

  it('renders the Inputs table with the discussed count', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ManagementReviewClient {...baseProps} />);

    expect(screen.getByText('Inputs (9.3.2)')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 discussed')).toBeInTheDocument();
    expect(screen.getByText('(a) Prior actions')).toBeInTheDocument();
    expect(screen.getByText('Comp AI > Risks (risk register)')).toBeInTheDocument();
    expect(screen.getByText('First review — no prior actions.')).toBeInTheDocument();
  });

  it('renders attendees, outputs, and the actions arising with owner and full reference', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ManagementReviewClient {...baseProps} />);

    expect(screen.getByText('Member One')).toBeInTheDocument();
    expect(
      screen.getByText('Two improvements agreed at this review.'),
    ).toBeInTheDocument();
    expect(screen.getByText('MR-2026-01-A01')).toBeInTheDocument();
    expect(
      screen.getByText('Formalise a quarterly access review process.'),
    ).toBeInTheDocument();
    // Owner resolved from memberOptions.
    expect(screen.getAllByText('Approver Two').length).toBeGreaterThan(0);
  });

  it('locks a signed review: no detail edits or input adds, sign-off stays editable', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ManagementReviewClient {...baseProps} />);

    // The fixture review is signed → locked notice, no edit/delete/add-input.
    expect(
      screen.getByText(/signed by the chair and locked/),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Edit review MR-2026-01'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Add input row')).not.toBeInTheDocument();
    expect(screen.queryByText('Add action')).not.toBeInTheDocument();
    // The sign-off slot stays live so the signature can be corrected/cleared,
    // and the action status keeps tracking to closure.
    expect(screen.getByText('Save sign-off')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit MR-2026-01-A01')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Delete MR-2026-01-A01'),
    ).not.toBeInTheDocument();
  });

  it('allows editing an unsigned review for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({
      reviews: [
        makeReview({ signoffChairName: null, signoffChairDate: null }),
      ],
    });
    render(<ManagementReviewClient {...baseProps} />);

    expect(screen.getByText('New review')).toBeInTheDocument();
    expect(screen.getByText('Add input row')).toBeInTheDocument();
    expect(screen.getByText('Add action')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit review MR-2026-01')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete review MR-2026-01')).toBeInTheDocument();
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    hookState.document = makeDocument({
      reviews: [
        makeReview({ signoffChairName: null, signoffChairDate: null }),
      ],
    });
    render(<ManagementReviewClient {...baseProps} />);

    expect(screen.queryByText('New review')).not.toBeInTheDocument();
    expect(screen.queryByText('Add input row')).not.toBeInTheDocument();
    expect(screen.queryByText('Add action')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit review MR-2026-01')).not.toBeInTheDocument();
    expect(screen.queryByText('Save sign-off')).not.toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('carries open actions forward to the next review', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({
      reviews: [
        makeReview(),
        makeReview({
          id: 'mr_2',
          reference: 'MR-2027-01',
          status: 'planned',
          signoffChairName: null,
          signoffChairDate: null,
          conclusionVerdict: null,
          inputs: [],
          actions: [],
        }),
      ],
    });
    render(<ManagementReviewClient {...baseProps} />);

    expect(
      screen.getByText('Carried forward from previous reviews'),
    ).toBeInTheDocument();
    // The first review's open action appears twice: on its own review and in
    // the second review's carried-forward table.
    expect(screen.getAllByText('MR-2026-01-A01')).toHaveLength(2);
  });

  it('warns when no review is recorded (clause 9.3 gate)', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({ reviews: [] });
    render(<ManagementReviewClient {...baseProps} />);

    expect(
      screen.getAllByText(/At least one management review must be recorded\./).length,
    ).toBeGreaterThan(0);
    // Empty state invites creating the first review.
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });

  it('warns when a completed review is missing its requirements', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({
      reviews: [
        makeReview({
          meetingDate: null,
          signoffChairName: null,
          signoffChairDate: null,
          inputs: [
            {
              id: 'mri_1',
              reviewId: 'mr_1',
              inputKey: 'a_prior_actions',
              inputRef: '(a) Prior actions',
              whatItCovers: 'Status of actions.',
              whereToFind: 'Comp AI > ISMS > Management Review',
              discussionNotes: null,
              discussed: false,
              source: 'derived',
              derivedFrom: 'seed:a_prior_actions',
              position: 0,
            },
          ],
        }),
      ],
    });
    render(<ManagementReviewClient {...baseProps} />);

    expect(
      screen.getAllByText(/MR-2026-01 is complete but has no meeting date\./).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/MR-2026-01 has 1 input not yet marked as discussed\./)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/MR-2026-01 is complete but has not been signed by the chair\./)
        .length,
    ).toBeGreaterThan(0);
  });
});
