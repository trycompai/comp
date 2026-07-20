import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { IsmsDocument, IsmsDriftResult, IsmsMetric } from '../isms-types';
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
const mockBulkCreate = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useIsmsDocument', () => ({
  useIsmsDocument: () => ({
    document: hookState.document,
    isExporting: false,
    generate: vi.fn().mockResolvedValue(undefined),
    createRow: mockCreateRow,
    updateRow: mockUpdateRow,
    deleteRow: mockDeleteRow,
    bulkCreateMeasurements: mockBulkCreate,
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

import { MonitoringClient } from './MonitoringClient';
import { addPeriods, periodStartFor } from './monitoring-periods';

const NOW = new Date();
const CURRENT = periodStartFor('monthly', NOW);
const PREVIOUS = addPeriods('monthly', CURRENT, -1);
const THREE_BACK = addPeriods('monthly', CURRENT, -3);

function makeMetric(overrides: Partial<IsmsMetric> = {}): IsmsMetric {
  return {
    id: 'met_1',
    metricKey: 'uptime',
    name: 'Production availability / uptime',
    whatIsMeasured: 'Availability of production services.',
    method: 'Cloud monitoring uptime reports.',
    cadence: 'monthly',
    monitorMemberId: null,
    analyzeMemberId: 'm2',
    target: '≥ 99.9% availability',
    objectiveId: null,
    objective: null,
    dataSource: 'manual',
    isActive: true,
    source: 'derived',
    derivedFrom: 'seed:uptime',
    position: 0,
    // Created three periods ago so the overdue fixture has a real gap.
    createdAt: `${THREE_BACK}T00:00:00.000Z`,
    measurements: [],
    ...overrides,
  };
}

// Latest measurement three periods back → overdue.
const OVERDUE_METRIC = makeMetric({
  measurements: [
    {
      id: 'msr_1',
      metricId: 'met_1',
      periodStart: THREE_BACK,
      value: '99.90%',
      note: 'baseline',
      recordedAt: `${THREE_BACK}T10:00:00.000Z`,
      enteredById: 'm2',
      source: 'manual',
    },
  ],
});

// Previous period recorded → within cadence, only the current period is due.
const HEALTHY_METRIC = makeMetric({
  id: 'met_2',
  metricKey: 'training_completion',
  name: 'Security awareness training completion',
  createdAt: `${PREVIOUS}T00:00:00.000Z`,
  measurements: [
    {
      id: 'msr_2',
      metricId: 'met_2',
      periodStart: PREVIOUS,
      value: '96%',
      note: null,
      recordedAt: `${PREVIOUS}T10:00:00.000Z`,
      enteredById: 'm2',
      source: 'manual',
    },
  ],
});

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'monitoring',
    status: 'draft',
    title: 'Monitoring, Measurement, Analysis and Evaluation',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: [],
    roles: [],
    metrics: [OVERDUE_METRIC, HEALTHY_METRIC],
    controlLinks: [],
    draftNarrative: null,
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
};

describe('MonitoringClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders the metrics register with provenance, people, and overdue state', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<MonitoringClient {...baseProps} />);

    // Metric names render on the register card and again in the due view.
    expect(
      screen.getAllByText('Production availability / uptime').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Security awareness training completion').length,
    ).toBeGreaterThan(0);
    // Seeded rows are labelled with their provenance.
    expect(screen.getAllByText('Auto-derived').length).toBeGreaterThan(0);
    // Null monitor resolves to the SPO default; explicit member to their name.
    expect(
      screen.getAllByText('Security & Privacy Owner (default)').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Approver Two').length).toBeGreaterThan(0);
    // The uptime metric's latest period is older than its cadence allows.
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
  });

  it('shows the Metrics due bulk-entry view with one row per missing period', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<MonitoringClient {...baseProps} />);

    expect(screen.getByText('Metrics due')).toBeInTheDocument();
    // Overdue metric: current + 2 gap periods; healthy metric: current only —
    // 4 rows in the page-level due card, doubled by the per-metric backfill
    // cards (the mocked Collapsible renders open).
    const inputs = screen.getAllByLabelText(/^Value for /);
    expect(inputs).toHaveLength(8);
    // "Same as last period" carries the previous value for one-click entry.
    expect(
      screen.getAllByText(/Same as last period \(99\.90%\)/).length,
    ).toBeGreaterThan(0);
  });

  it('shows measurement history with honest recorded-on data and gap rows', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<MonitoringClient {...baseProps} />);

    // The mocked Collapsible renders open, exposing the history table.
    expect(screen.getAllByText('99.90%').length).toBeGreaterThan(0);
    expect(screen.getByText('baseline')).toBeInTheDocument();
    // CSV export is offered per metric history.
    expect(screen.getAllByText('Export CSV').length).toBeGreaterThan(0);
  });

  it('allows editing for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<MonitoringClient {...baseProps} />);

    expect(screen.getByText('Add metric')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Edit /).length).toBe(2);
    // Seeded metrics offer Deactivate, never metric Delete (measurement-row
    // delete buttons still exist in the history table).
    expect(screen.getAllByText('Deactivate').length).toBe(2);
    expect(
      screen.queryByLabelText('Delete Production availability / uptime'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Delete Security awareness training completion'),
    ).not.toBeInTheDocument();
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('offers Delete only for custom metrics', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({
      metrics: [
        makeMetric({ id: 'met_9', metricKey: null, name: 'Custom metric', source: 'manual' }),
      ],
    });
    render(<MonitoringClient {...baseProps} />);

    expect(screen.getByLabelText('Delete Custom metric')).toBeInTheDocument();
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<MonitoringClient {...baseProps} />);

    expect(screen.queryByText('Add metric')).not.toBeInTheDocument();
    expect(screen.queryByText('Metrics due')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Edit /)).not.toBeInTheDocument();
    expect(screen.queryByText('Deactivate')).not.toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('warns when no metric is active (clause 9.1 gate)', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.document = makeDocument({
      metrics: [makeMetric({ isActive: false })],
    });
    render(<MonitoringClient {...baseProps} />);

    // Surfaced twice: the register warning and the submit-blocked reason.
    expect(
      screen.getAllByText(/At least one metric must be active\./).length,
    ).toBeGreaterThan(0);
  });
});
