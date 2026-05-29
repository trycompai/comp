import { render, screen, waitFor } from '@testing-library/react';
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
  IsmsInterestedPartyRequirement,
} from '../isms-types';

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

// ─── Mock design system ──────────────────────────────────────
vi.mock('@trycompai/design-system', () => ({
  Alert: ({ children, title }: { children?: React.ReactNode; title?: React.ReactNode }) => (
    <div role="alert">
      {title}
      {children}
    </div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick, disabled, 'aria-label': ariaLabel }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  PageHeader: ({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions}
    </div>
  ),
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
  Checkmark: () => <span />,
  CloseOutline: () => <span />,
  Document: () => <span />,
  Download: () => <span />,
  MachineLearningModel: () => <span />,
  Renew: () => <span />,
  TrashCan: () => <span />,
  WarningAlt: () => <span />,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { RequirementsClient } from './RequirementsClient';

const REQUIREMENTS: IsmsInterestedPartyRequirement[] = [
  {
    id: 'r1',
    interestedPartyId: 'ip1',
    partyName: 'Customers',
    requirement: 'Derived customer requirement',
    treatment: 'Encrypt data at rest',
    source: 'derived',
    derivedFrom: 'framework:ISO 27001',
    position: 0,
  },
  {
    id: 'r2',
    interestedPartyId: null,
    partyName: 'Regulators',
    requirement: 'Manual regulator requirement',
    treatment: 'Maintain breach notification process',
    source: 'manual',
    derivedFrom: null,
    position: 1,
  },
];

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'interested_parties_requirements',
    status: 'draft',
    title: 'Interested Parties Requirements',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: REQUIREMENTS,
    objectives: [],
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

describe('RequirementsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders derived and edited requirements with provenance', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<RequirementsClient {...baseProps} />);

    expect(screen.getByDisplayValue('Derived customer requirement')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Encrypt data at rest')).toBeInTheDocument();
    expect(screen.getByText('framework:ISO 27001')).toBeInTheDocument();
    // Derived rows are labelled "Auto-derived"; manual rows are "Edited".
    expect(screen.getAllByText('Auto-derived').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Edited').length).toBeGreaterThan(0);
  });

  it('allows editing (shows mutating controls) for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<RequirementsClient {...baseProps} />);

    expect(screen.getByText('Generate from platform data')).toBeInTheDocument();
    expect(screen.getByText('Add requirement')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Delete requirement').length).toBe(REQUIREMENTS.length);
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<RequirementsClient {...baseProps} />);

    expect(screen.queryByText('Generate from platform data')).not.toBeInTheDocument();
    expect(screen.queryByText('Add requirement')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete requirement')).not.toBeInTheDocument();
    // Read-only users see plain text, not editable inputs.
    expect(screen.queryByDisplayValue('Derived customer requirement')).not.toBeInTheDocument();
    expect(screen.getByText('Derived customer requirement')).toBeInTheDocument();
    // Export remains available to readers.
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('shows the drift banner when the document is stale', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.drift = { isStale: true, changedSources: ['vendorCount', 'frameworks'] };
    render(<RequirementsClient {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Out of date')).toBeInTheDocument();
    });
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });
});
