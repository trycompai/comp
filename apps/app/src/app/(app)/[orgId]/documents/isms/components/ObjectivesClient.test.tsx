import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { IsmsDocument, IsmsDriftResult, IsmsObjective } from '../isms-types';
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

const mockGenerate = vi.fn().mockResolvedValue(undefined);
const mockCreateRow = vi.fn().mockResolvedValue(undefined);
const mockUpdateRow = vi.fn().mockResolvedValue(undefined);
const mockDeleteRow = vi.fn().mockResolvedValue(undefined);
const mockHandleExport = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useIsmsDocument', () => ({
  useIsmsDocument: () => ({
    document: hookState.document,
    isExporting: false,
    generate: mockGenerate,
    createRow: mockCreateRow,
    updateRow: mockUpdateRow,
    deleteRow: mockDeleteRow,
    submitForApproval: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    decline: vi.fn().mockResolvedValue(undefined),
    getDrift: vi.fn().mockResolvedValue(hookState.drift),
    handleExport: mockHandleExport,
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

import { ObjectivesClient } from './ObjectivesClient';

const OBJECTIVES: IsmsObjective[] = [
  {
    id: 'o1',
    objective: 'Reduce phishing click rate',
    target: 'Below 3%',
    ownerMemberId: 'm2',
    cadence: 'Quarterly',
    plan: 'Run quarterly phishing simulations',
    measurementMethod: 'Simulation results',
    status: 'on_track',
    source: 'derived',
    derivedFrom: 'framework:ISO 27001',
    position: 0,
  },
  {
    id: 'o2',
    objective: 'Patch critical vulnerabilities within SLA',
    target: '100%',
    ownerMemberId: null,
    cadence: 'Monthly',
    plan: 'Track via vulnerability scanner',
    measurementMethod: 'Scanner report',
    status: 'at_risk',
    source: 'manual',
    derivedFrom: null,
    position: 1,
  },
];

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'objectives_plan',
    status: 'draft',
    title: 'Information Security Objectives and Plan',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: OBJECTIVES,
    controlLinks: [],
    versions: [],
    ...overrides,
  };
}

const baseProps = {
  organizationId: 'org-1',
  documentId: 'd1',
  fallbackData: null,
  currentMemberId: 'm1',
  approverOptions: [{ id: 'm2', name: 'Approver Two' }],
};

describe('ObjectivesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders the objectives register with provenance', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ObjectivesClient {...baseProps} />);

    // Read-first cards show the objective text + status, not always-on inputs.
    expect(screen.getByText('Reduce phishing click rate')).toBeInTheDocument();
    expect(screen.getByText('Patch critical vulnerabilities within SLA')).toBeInTheDocument();
    expect(screen.getByText('framework:ISO 27001')).toBeInTheDocument();
    // Status renders through the shared badge vocabulary.
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('At risk')).toBeInTheDocument();
    // Derived rows are labelled "Auto-derived"; manual rows are "Manual".
    expect(screen.getAllByText('Auto-derived').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manual').length).toBeGreaterThan(0);
  });

  it('allows editing (shows mutating controls) for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ObjectivesClient {...baseProps} />);

    expect(screen.getByText('Generate from platform data')).toBeInTheDocument();
    expect(screen.getByText('Add objective')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Edit objective').length).toBe(OBJECTIVES.length);
    expect(screen.getAllByLabelText('Delete objective').length).toBe(OBJECTIVES.length);
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ObjectivesClient {...baseProps} />);

    expect(screen.queryByText('Generate from platform data')).not.toBeInTheDocument();
    expect(screen.queryByText('Add objective')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit objective')).not.toBeInTheDocument();
    // Read-only users see plain text, not editable inputs.
    expect(screen.queryByDisplayValue('Reduce phishing click rate')).not.toBeInTheDocument();
    expect(screen.getByText('Reduce phishing click rate')).toBeInTheDocument();
    // Export remains available to readers.
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('shows the drift banner when the document is stale', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.drift = { isStale: true, changedSources: ['vendorCount', 'memberCount'] };
    render(<ObjectivesClient {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Out of date')).toBeInTheDocument();
    });
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });
});
