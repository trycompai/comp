import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { IsmsContextIssue, IsmsDocument, IsmsDriftResult } from '../isms-types';
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
const mockCreateIssue = vi.fn().mockResolvedValue(undefined);
const mockUpdateIssue = vi.fn().mockResolvedValue(undefined);
const mockDeleteIssue = vi.fn().mockResolvedValue(undefined);
const mockHandleExport = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useIsmsDocument', () => ({
  useIsmsDocument: () => ({
    document: hookState.document,
    isExporting: false,
    generate: mockGenerate,
    createIssue: mockCreateIssue,
    updateIssue: mockUpdateIssue,
    deleteIssue: mockDeleteIssue,
    submitForApproval: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    decline: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
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

vi.mock('./IsmsVersionHistory', () => ({
  IsmsVersionHistory: () => <div data-testid="isms-version-history" />,
}));

import { ContextOfOrganizationClient } from './ContextOfOrganizationClient';

const ISSUES: IsmsContextIssue[] = [
  {
    id: 'i1',
    kind: 'internal',
    category: 'Governance & Structure',
    description: 'Derived internal issue',
    effect: 'Internal effect',
    source: 'derived',
    derivedFrom: 'member:hr',
    position: 0,
  },
  {
    id: 'i2',
    kind: 'external',
    category: 'Regulatory & Legal',
    description: 'Derived external issue',
    effect: 'External effect',
    source: 'derived',
    derivedFrom: 'framework:ISO 27001',
    position: 1,
  },
];

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'context_of_organization',
    status: 'draft',
    title: 'Context of the Organization',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: ISSUES,
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: [],
    roles: [],
    metrics: [],
    audits: [],
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
};

describe('ContextOfOrganizationClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders derived issues with provenance', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ContextOfOrganizationClient {...baseProps} />);

    // Read-first cards show the issue text, not always-on textareas.
    expect(screen.getByText('Derived internal issue')).toBeInTheDocument();
    expect(screen.getByText('Derived external issue')).toBeInTheDocument();
    expect(screen.getByText('framework:ISO 27001')).toBeInTheDocument();
    // Derived rows are labelled "Auto-derived".
    expect(screen.getAllByText('Auto-derived').length).toBeGreaterThan(0);
  });

  it('allows editing (shows mutating controls) for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ContextOfOrganizationClient {...baseProps} />);

    expect(screen.getByText('Generate from platform data')).toBeInTheDocument();
    // One collapsed "Add … issue" trigger per kind section.
    expect(screen.getAllByText(/Add internal issue|Add external issue/).length).toBe(2);
    // Each card exposes an Edit affordance instead of always-on inputs.
    expect(screen.getAllByLabelText('Edit issue').length).toBe(2);
    expect(screen.getAllByLabelText('Delete issue').length).toBe(2);
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('renders each issue category and exposes a per-kind add affordance for an admin', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ContextOfOrganizationClient {...baseProps} />);

    // Read-mode rows surface the clause 4.1 category alongside the source pill.
    expect(screen.getByText('Governance & Structure')).toBeInTheDocument();
    expect(screen.getByText('Regulatory & Legal')).toBeInTheDocument();
    // The add-issue affordance is present for both internal and external kinds.
    expect(screen.getByText('Add internal issue')).toBeInTheDocument();
    expect(screen.getByText('Add external issue')).toBeInTheDocument();
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ContextOfOrganizationClient {...baseProps} />);

    expect(screen.queryByText('Generate from platform data')).not.toBeInTheDocument();
    expect(screen.queryByText(/Add internal issue/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit issue')).not.toBeInTheDocument();
    // Read-only users see plain text, not editable textareas.
    expect(screen.queryByDisplayValue('Derived internal issue')).not.toBeInTheDocument();
    expect(screen.getByText('Derived internal issue')).toBeInTheDocument();
    // Export remains available to readers.
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('shows the drift banner when the document is stale', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.drift = { isStale: true, changedSources: ['vendorCount', 'memberCount'] };
    render(<ContextOfOrganizationClient {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Out of date')).toBeInTheDocument();
    });
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });
});
