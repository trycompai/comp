import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { IsmsDocument, IsmsDocumentStatus } from '../isms-types';

// ─── Mock design system ──────────────────────────────────────────
vi.mock('@trycompai/design-system', () => ({
  Alert: ({ children }: { children?: ReactNode }) => <div role="alert">{children}</div>,
  AlertTitle: ({ children }: { children: ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ApprovalBanner: ({
    title,
    onApprove,
    onReject,
    approveText,
    rejectText,
  }: {
    title: string;
    onApprove?: () => void;
    onReject?: () => void;
    approveText?: string;
    rejectText?: string;
  }) => (
    <div data-testid="approval-banner">
      <span>{title}</span>
      <button type="button" onClick={onApprove}>
        {approveText}
      </button>
      <button type="button" onClick={onReject}>
        {rejectText}
      </button>
    </div>
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  // Expose the approver options as plain native <option>s wired to onValueChange
  // so tests can drive the real selection -> handleSubmit gating.
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <select
      aria-label="Approver"
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value="" />
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Time: () => <span data-testid="time-icon" />,
}));

import { IsmsApprovalSection } from './IsmsApprovalSection';

const APPROVER_OPTIONS = [
  { id: 'mem_approver', name: 'Avery Approver' },
  { id: 'mem_other', name: 'Other Member' },
];

function makeDocument(overrides: Partial<IsmsDocument> = {}): IsmsDocument {
  return {
    id: 'd1',
    type: 'context_of_organization',
    status: 'draft' as IsmsDocumentStatus,
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
    controlLinks: [],
    draftNarrative: null,
    currentVersionId: null,
    currentVersion: null,
    ...overrides,
  };
}

const baseProps = {
  canManage: true,
  currentMemberId: 'mem_current',
  approverOptions: APPROVER_OPTIONS,
  onSubmitForApproval: vi.fn().mockResolvedValue(undefined),
  onApprove: vi.fn().mockResolvedValue(undefined),
  onDecline: vi.fn().mockResolvedValue(undefined),
};

describe('IsmsApprovalSection', () => {
  it('shows "Submit for approval" only for a draft document', () => {
    render(<IsmsApprovalSection {...baseProps} document={makeDocument()} />);
    expect(screen.getByText('Submit for approval')).toBeInTheDocument();
  });

  it('renders an approved state (approver + date) and hides the submit button', () => {
    render(
      <IsmsApprovalSection
        {...baseProps}
        document={makeDocument({
          status: 'approved',
          approverId: 'mem_approver',
          approvedAt: '2026-01-15T00:00:00.000Z',
        })}
      />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Avery Approver')).toBeInTheDocument();
    expect(screen.queryByText('Submit for approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Resubmit for approval')).not.toBeInTheDocument();
  });

  it('renders a declined state and offers resubmit (not the plain submit)', () => {
    render(
      <IsmsApprovalSection
        {...baseProps}
        document={makeDocument({
          status: 'declined',
          approverId: 'mem_approver',
          declinedAt: '2026-02-20T00:00:00.000Z',
        })}
      />,
    );
    expect(screen.getByText('Declined')).toBeInTheDocument();
    expect(screen.queryByText('Submit for approval')).not.toBeInTheDocument();
    expect(screen.getByText('Resubmit for approval')).toBeInTheDocument();
  });

  it('renders a pending-with-approver state and hides the submit button', () => {
    render(
      <IsmsApprovalSection
        {...baseProps}
        document={makeDocument({ status: 'needs_review', approverId: 'mem_approver' })}
      />,
    );
    expect(screen.getByText('Pending approval')).toBeInTheDocument();
    expect(screen.getByText('Avery Approver')).toBeInTheDocument();
    expect(screen.queryByText('Submit for approval')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-banner')).not.toBeInTheDocument();
  });

  it('shows the approver action banner when the current user is the approver', () => {
    render(
      <IsmsApprovalSection
        {...baseProps}
        currentMemberId="mem_approver"
        document={makeDocument({ status: 'needs_review', approverId: 'mem_approver' })}
      />,
    );
    expect(screen.getByTestId('approval-banner')).toBeInTheDocument();
    expect(screen.getByText('Action required by you')).toBeInTheDocument();
  });

  it('does not offer submit affordances to read-only users', () => {
    render(
      <IsmsApprovalSection {...baseProps} canManage={false} document={makeDocument()} />,
    );
    expect(screen.queryByText('Submit for approval')).not.toBeInTheDocument();
    expect(screen.queryByText('Resubmit for approval')).not.toBeInTheDocument();
  });
});

describe('IsmsApprovalSection interactions', () => {
  // Fresh handlers per test so call counts are isolated from the module-level
  // baseProps mocks used by the presence tests above.
  function makeHandlers() {
    return {
      onSubmitForApproval: vi.fn().mockResolvedValue(undefined),
      onApprove: vi.fn().mockResolvedValue(undefined),
      onDecline: vi.fn().mockResolvedValue(undefined),
    };
  }

  it('calls onApprove exactly once when the approver clicks Approve', () => {
    const handlers = makeHandlers();
    render(
      <IsmsApprovalSection
        canManage={false}
        currentMemberId="mem_approver"
        approverOptions={APPROVER_OPTIONS}
        document={makeDocument({ status: 'needs_review', approverId: 'mem_approver' })}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(handlers.onApprove).toHaveBeenCalledTimes(1);
    expect(handlers.onDecline).not.toHaveBeenCalled();
  });

  it('calls onDecline exactly once when the approver clicks Decline', () => {
    const handlers = makeHandlers();
    render(
      <IsmsApprovalSection
        canManage={false}
        currentMemberId="mem_approver"
        approverOptions={APPROVER_OPTIONS}
        document={makeDocument({ status: 'needs_review', approverId: 'mem_approver' })}
        {...handlers}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(handlers.onDecline).toHaveBeenCalledTimes(1);
    expect(handlers.onApprove).not.toHaveBeenCalled();
  });

  it('lets an editor submit a draft for approval with the chosen approver', async () => {
    const handlers = makeHandlers();
    render(
      <IsmsApprovalSection
        canManage
        currentMemberId="mem_current"
        approverOptions={APPROVER_OPTIONS}
        document={makeDocument()}
        {...handlers}
      />,
    );

    // Open the submit dialog.
    fireEvent.click(screen.getByText('Submit for approval'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Confirm is disabled until an approver is chosen.
    const confirm = screen.getByRole('button', { name: 'Confirm & Submit' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Approver' }), {
      target: { value: 'mem_approver' },
    });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);

    await waitFor(() => {
      expect(handlers.onSubmitForApproval).toHaveBeenCalledTimes(1);
    });
    expect(handlers.onSubmitForApproval).toHaveBeenCalledWith('mem_approver');
  });
});
