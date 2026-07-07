import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { IsmsDocument, IsmsDriftResult, IsmsScopeNarrative } from '../isms-types';

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
const mockSaveNarrative = vi.fn().mockResolvedValue(undefined);
const mockHandleExport = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useIsmsDocument', () => ({
  useIsmsDocument: () => ({
    document: hookState.document,
    isExporting: false,
    generate: mockGenerate,
    saveNarrative: mockSaveNarrative,
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
  Button: ({ children, onClick, disabled, type, 'aria-label': ariaLabel }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} type={type}>
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
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Section: ({ title, children }: { title?: React.ReactNode; children: React.ReactNode }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Spinner: () => <span role="status" aria-label="Loading" />,
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
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

vi.mock('./IsmsControlMappings', () => ({
  IsmsControlMappings: () => <div data-testid="isms-control-mappings" />,
}));

vi.mock('./IsmsVersionHistory', () => ({
  IsmsVersionHistory: () => <div data-testid="isms-version-history" />,
}));

vi.mock('./shared', () => ({
  IsmsPageHeader: ({
    clause,
    title,
    actions,
  }: {
    clause: string;
    title: string;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="page-header">
      <h1>{`${clause} ${title}`}</h1>
      {actions}
    </div>
  ),
}));

import { ScopeClient } from './ScopeClient';

const NARRATIVE: IsmsScopeNarrative = {
  certificateScopeSentence: 'The provision of SaaS compliance tooling operating from AWS us-east-1.',
  inScope: 'All production services and supporting corporate systems.',
  interfaces: ['Customer support portal', 'Payment processor'],
  dependencies: ['AWS', 'Stripe'],
  exclusions: ['Legacy on-premise billing system'],
  justification: 'The legacy system is decommissioned and isolated.',
};

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'isms_scope',
    status: 'draft',
    title: 'ISMS Scope',
    approverId: null,
    approvedAt: null,
    declinedAt: null,
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: [],
    controlLinks: [],
    draftNarrative: NARRATIVE,
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

describe('ScopeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.document = makeDocument();
    hookState.drift = { isStale: false, changedSources: [] };
  });

  it('renders the narrative content including the prominent certificate scope', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ScopeClient {...baseProps} />);

    expect(screen.getByText('Customer-approved')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'The provision of SaaS compliance tooling operating from AWS us-east-1.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Customer support portal')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('Legacy on-premise billing system')).toBeInTheDocument();
  });

  it('shows mutating controls for a user with evidence:update', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ScopeClient {...baseProps} />);

    expect(screen.getByText('Generate from platform data')).toBeInTheDocument();
    expect(screen.getByText('Save scope')).toBeInTheDocument();
    // Editable fields are textareas/inputs.
    expect(
      screen.getByDisplayValue('All production services and supporting corporate systems.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('New Interfaces item')).toBeInTheDocument();
    expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
  });

  it('hides mutating controls for a read-only user but keeps export', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ScopeClient {...baseProps} />);

    expect(screen.queryByText('Generate from platform data')).not.toBeInTheDocument();
    expect(screen.queryByText('Save scope')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New Interfaces item')).not.toBeInTheDocument();
    // Read-only users see plain text, not editable fields.
    expect(
      screen.queryByDisplayValue(
        'The provision of SaaS compliance tooling operating from AWS us-east-1.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('The provision of SaaS compliance tooling operating from AWS us-east-1.'),
    ).toBeInTheDocument();
    // Read-only items still render and export remains available.
    expect(screen.getByText('Customer support portal')).toBeInTheDocument();
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
    expect(screen.getByText('Export DOCX')).toBeInTheDocument();
  });

  it('shows the drift banner when the document is stale', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    hookState.drift = { isStale: true, changedSources: ['vendorCount'] };
    render(<ScopeClient {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('Out of date')).toBeInTheDocument();
    });
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });
});
