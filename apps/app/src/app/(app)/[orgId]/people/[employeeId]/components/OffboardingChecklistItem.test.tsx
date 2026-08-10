import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ChecklistItem } from '@/hooks/use-offboarding-checklist';

vi.mock('@trycompai/design-system', () => ({
  Collapsible: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  HStack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Stack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  ChevronDown: () => <span>chevron</span>,
  Checkmark: () => <span>check</span>,
  DocumentDownload: () => <span>download</span>,
  Upload: () => <span>upload</span>,
}));

vi.mock('@/hooks/use-access-revocations', () => ({
  useAccessRevocations: () => ({ revocations: null }),
}));

vi.mock('./AccessRevocationList', () => ({
  AccessRevocationList: () => <div>access-revocation-list</div>,
}));

import { OffboardingChecklistItem } from './OffboardingChecklistItem';

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    templateItemId: 'oct_1',
    title: 'Retrieve company devices',
    description: 'Collect all company-owned hardware.',
    evidenceRequired: false,
    isAccessRevocation: false,
    sortOrder: 1,
    completed: false,
    isException: false,
    exceptionReason: null,
    completedAt: null,
    completedBy: null,
    completionId: null,
    notes: null,
    evidence: [],
    ...overrides,
  };
}

const noop = vi.fn().mockResolvedValue(undefined);

function renderItem(item: ChecklistItem, handlers: Record<string, unknown> = {}) {
  return render(
    <OffboardingChecklistItem
      item={item}
      memberId="mem_1"
      canEdit
      onComplete={noop}
      onUncomplete={noop}
      onMarkException={noop}
      onUploadEvidence={noop}
      onDownload={noop}
      {...handlers}
    />,
  );
}

describe('OffboardingChecklistItem — exceptions', () => {
  it('marks an unresolved step as an exception with a typed reason', async () => {
    const onMarkException = vi.fn().mockResolvedValue(undefined);
    renderItem(makeItem(), { onMarkException });

    fireEvent.click(screen.getByRole('button', { name: /mark as exception/i }));

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'This person was never issued a company device' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save exception/i }));

    await waitFor(() =>
      expect(onMarkException).toHaveBeenCalledWith({
        templateItemId: 'oct_1',
        reason: 'This person was never issued a company device',
      }),
    );
  });

  it('shows the reason and a remove action for an excepted step', async () => {
    const onUncomplete = vi.fn().mockResolvedValue(undefined);
    renderItem(
      makeItem({
        completed: true,
        isException: true,
        exceptionReason: 'No company device was ever issued',
      }),
      { onUncomplete },
    );

    expect(
      screen.getByText('No company device was ever issued'),
    ).toBeInTheDocument();
    // The "Mark complete" affordance must NOT be offered for an exception.
    expect(
      screen.queryByRole('button', { name: /mark complete/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove exception/i }));
    await waitFor(() => expect(onUncomplete).toHaveBeenCalledWith('oct_1'));
  });
});
