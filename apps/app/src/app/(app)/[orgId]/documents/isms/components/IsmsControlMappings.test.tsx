import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsControlLink, IsmsDocument } from '../isms-types';

// ─── Mock the ISMS document hook (add/remove control mappings) ───
const mockAddControlMappings = vi.fn().mockResolvedValue(undefined);
const mockRemoveControlMapping = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useIsmsDocument', () => ({
  useIsmsDocument: () => ({
    addControlMappings: mockAddControlMappings,
    removeControlMapping: mockRemoveControlMapping,
  }),
}));

// ─── Mock api client (imported by the SWR fetcher) ───────────────
vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

// ─── Mock SWR — return the selectable org controls directly ──────
const swrState: { data: Array<{ id: string; name: string }> | undefined } = {
  data: [
    { id: 'ctl_1', name: 'Access Control Policy' },
    { id: 'ctl_2', name: 'Encryption Standard' },
  ],
};

vi.mock('swr', () => ({
  default: () => ({ data: swrState.data, mutate: vi.fn() }),
}));

// ─── Mock next/link ──────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ─── Mock sonner ─────────────────────────────────────────────────
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ─── Mock design system ──────────────────────────────────────────
vi.mock('@trycompai/design-system', () => ({
  Section: ({
    title,
    actions,
    children,
  }: {
    title: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {actions}
      {children}
    </section>
  ),
  buttonVariants: () => 'btn',
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    'aria-label'?: string;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
  ItemGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Item: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
  }) =>
    render ? <div>{render}{children}</div> : <div>{children}</div>,
  ItemMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ItemTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Empty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({
    children,
    disabled,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Command: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandInput: (props: React.ComponentProps<'input'>) => <input {...props} />,
  CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AlertDialog: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
  Launch: () => <span data-testid="launch-icon" />,
  Rule: () => <span data-testid="rule-icon" />,
  Unlink: () => <span data-testid="unlink-icon" />,
  // Status-badge icons pulled in via the shared barrel (IsmsStatusBadge).
  ArrowRight: () => <span />,
  CircleDash: () => <span />,
  Edit: () => <span />,
  CheckmarkFilled: () => <span />,
  Misuse: () => <span />,
  Time: () => <span />,
  WarningAltFilled: () => <span />,
}));

import { IsmsControlMappings } from './IsmsControlMappings';

const LINKS: IsmsControlLink[] = [
  { id: 'idc_1', controlId: 'ctl_1', control: { id: 'ctl_1', name: 'Access Control Policy' } },
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
    contextIssues: [],
    interestedParties: [],
    interestedPartyRequirements: [],
    objectives: [],
    roles: [],
    metrics: [],
    audits: [],
    controlLinks: LINKS,
    draftNarrative: null,
    currentVersionId: null,
    currentVersion: null,
    ...overrides,
  };
}

const baseProps = {
  organizationId: 'org-1',
  canManage: true,
};

describe('IsmsControlMappings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState.data = [
      { id: 'ctl_1', name: 'Access Control Policy' },
      { id: 'ctl_2', name: 'Encryption Standard' },
    ];
  });

  it('renders linked controls by name', () => {
    render(<IsmsControlMappings {...baseProps} document={makeDocument()} />);
    expect(screen.getByText('Access Control Policy')).toBeInTheDocument();
  });

  it('shows an empty state when no controls are linked', () => {
    render(
      <IsmsControlMappings {...baseProps} document={makeDocument({ controlLinks: [] })} />,
    );
    expect(screen.getByText('No controls linked yet.')).toBeInTheDocument();
  });

  it('lets a user with evidence:update link a control', async () => {
    render(<IsmsControlMappings {...baseProps} document={makeDocument()} />);

    // Already-linked ctl_1 is filtered out; ctl_2 remains selectable.
    expect(screen.queryByText('Link control')).toBeInTheDocument();
    const option = screen.getByRole('button', { name: 'Encryption Standard' });
    fireEvent.click(option);

    await waitFor(() => expect(mockAddControlMappings).toHaveBeenCalledWith(['ctl_2']));
  });

  it('lets a user with evidence:update unlink a control', async () => {
    render(<IsmsControlMappings {...baseProps} document={makeDocument()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Unlink Access Control Policy' }));
    // Confirm in the dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));

    await waitFor(() => expect(mockRemoveControlMapping).toHaveBeenCalledWith('ctl_1'));
  });

  it('is read-only without evidence:update (no link/unlink controls)', () => {
    render(
      <IsmsControlMappings {...baseProps} canManage={false} document={makeDocument()} />,
    );

    // Linked controls still render for readers.
    expect(screen.getByText('Access Control Policy')).toBeInTheDocument();
    // No link/unlink affordances.
    expect(screen.queryByText('Link control')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Unlink Access Control Policy' }),
    ).not.toBeInTheDocument();
  });
});
