import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import { toast } from 'sonner';
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
// Override IsmsAddCard so the closed-state trigger toggles the real form open,
// letting the mutation-through-to-hook test fill + submit the add form.
vi.mock('./shared', () => {
  const shared = ismsSharedMock();
  function IsmsAddCard({
    addLabel,
    children,
  }: {
    addLabel: string;
    children: (helpers: { close: () => void }) => ReactNode;
  }) {
    const { useState } = require('react') as typeof import('react');
    const [isOpen, setIsOpen] = useState(false);
    if (!isOpen) {
      return (
        <button type="button" onClick={() => setIsOpen(true)}>
          {addLabel}
        </button>
      );
    }
    return <div>{children({ close: () => setIsOpen(false) })}</div>;
  }
  return { ...shared, IsmsAddCard };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('./IsmsControlMappings', () => ({
  IsmsControlMappings: () => <div data-testid="isms-control-mappings" />,
}));

vi.mock('./IsmsVersionHistory', () => ({
  IsmsVersionHistory: () => <div data-testid="isms-version-history" />,
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

  it('creates a party through to hook.createRow with the register + form data', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InterestedPartiesClient {...baseProps} />);

    // Open the add form (closed-state trigger), then fill the three fields.
    fireEvent.click(screen.getByText('Add interested party'));

    fireEvent.change(screen.getByLabelText('New interested party name'), {
      target: { value: 'Suppliers' },
    });
    fireEvent.change(screen.getByLabelText('New interested party category'), {
      target: { value: 'External' },
    });
    fireEvent.change(screen.getByLabelText('New interested party needs and expectations'), {
      target: { value: 'Timely security disclosures' },
    });

    // Once open, the submit button shares the label; it is the last match.
    const submitButtons = screen.getAllByText('Add interested party');
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(mockCreateRow).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateRow).toHaveBeenCalledWith({
      register: 'interested-parties',
      data: {
        name: 'Suppliers',
        category: 'External',
        needsExpectations: 'Timely security disclosures',
      },
    });
  });

  it('edits a row through to hook.updateRow with the register, row id + changes', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<InterestedPartiesClient {...baseProps} />);

    // Enter edit mode on the first row, change the name, then save.
    fireEvent.click(screen.getAllByLabelText('Edit interested party')[0]);

    const nameInput = screen.getByLabelText('Interested party name');
    fireEvent.change(nameInput, { target: { value: 'Key Customers' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateRow).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateRow).toHaveBeenCalledWith({
      register: 'interested-parties',
      id: 'p1',
      data: {
        name: 'Key Customers',
        category: 'External',
        needsExpectations: 'Confidentiality of their data',
      },
    });
  });

  it('keeps the add form open with the user input when hook.createRow rejects', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    mockCreateRow.mockRejectedValueOnce(new Error('Network error'));
    render(<InterestedPartiesClient {...baseProps} />);

    fireEvent.click(screen.getByText('Add interested party'));
    fireEvent.change(screen.getByLabelText('New interested party name'), {
      target: { value: 'Suppliers' },
    });
    fireEvent.change(screen.getByLabelText('New interested party category'), {
      target: { value: 'External' },
    });
    fireEvent.change(screen.getByLabelText('New interested party needs and expectations'), {
      target: { value: 'Timely security disclosures' },
    });

    const submitButtons = screen.getAllByText('Add interested party');
    fireEvent.click(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
    // The handler re-throws, so the form stays open with the user's input intact.
    expect(screen.getByLabelText('New interested party name')).toHaveValue('Suppliers');
    expect(
      screen.getByLabelText('New interested party needs and expectations'),
    ).toHaveValue('Timely security disclosures');
  });

  it('keeps the row in edit mode with the user changes when hook.updateRow rejects', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    mockUpdateRow.mockRejectedValueOnce(new Error('Save failed'));
    render(<InterestedPartiesClient {...baseProps} />);

    fireEvent.click(screen.getAllByLabelText('Edit interested party')[0]);
    fireEvent.change(screen.getByLabelText('Interested party name'), {
      target: { value: 'Key Customers' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Save failed');
    });
    // The handler re-throws, so the row stays in edit mode with the user's changes.
    expect(screen.getByLabelText('Interested party name')).toHaveValue('Key Customers');
  });
});
