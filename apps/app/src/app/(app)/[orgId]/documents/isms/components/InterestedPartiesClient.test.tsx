import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { IsmsDocument, IsmsDriftResult, IsmsInterestedParty } from '../isms-types';
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

import { InterestedPartiesClient } from './InterestedPartiesClient';

const PARTIES: IsmsInterestedParty[] = [
  {
    id: 'p1',
    name: 'Customers',
    category: 'External',
    needsExpectations: 'Confidentiality of their data',
    source: 'derived',
    derivedFrom: 'vendor:customers',
    position: 0,
  },
  {
    id: 'p2',
    name: 'Data Protection Authority',
    category: 'Regulator',
    needsExpectations: 'Compliance with applicable regulation',
    source: 'manual',
    derivedFrom: null,
    position: 1,
  },
];

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'interested_parties_register',
    status: 'draft',
    title: 'Interested Parties Register',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: PARTIES,
    interestedPartyRequirements: [],
    objectives: [],
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

describe('InterestedPartiesClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders the register content as read-first cards', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InterestedPartiesClient {...baseProps} />);

    // Read-first cards show the party name + needs as text, not always-on inputs.
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Data Protection Authority')).toBeInTheDocument();
    expect(screen.getByText('Confidentiality of their data')).toBeInTheDocument();
    // The category badge is shown; the redundant auto-derive provenance pill is not.
    expect(screen.getByText('External')).toBeInTheDocument();
    expect(screen.getByText('Regulator')).toBeInTheDocument();
    expect(screen.queryByText('vendor:customers')).not.toBeInTheDocument();
  });

  it('allows editing (shows mutating controls) for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InterestedPartiesClient {...baseProps} />);

    expect(screen.getByText('Generate from platform data')).toBeInTheDocument();
    expect(screen.getByText('Add interested party')).toBeInTheDocument();
    // Each card exposes an Edit affordance instead of always-on inputs.
    expect(screen.getAllByLabelText('Edit interested party').length).toBe(2);
    expect(screen.getAllByLabelText('Delete interested party').length).toBe(2);
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<InterestedPartiesClient {...baseProps} />);

    expect(screen.queryByText('Generate from platform data')).not.toBeInTheDocument();
    expect(screen.queryByText('Add interested party')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit interested party')).not.toBeInTheDocument();
    // Read-only users see plain text, not editable inputs.
    expect(screen.queryByDisplayValue('Customers')).not.toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    // Export remains available to readers.
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('shows the drift banner when the document is stale', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.drift = { isStale: true, changedSources: ['vendorCount', 'memberCount'] };
    render(<InterestedPartiesClient {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Out of date')).toBeInTheDocument();
    });
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });
});
