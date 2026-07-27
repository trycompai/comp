import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';

// Lightweight stand-ins for the design-system / ui primitives so the pager
// buttons and rows are queryable in jsdom without pulling the real components.
vi.mock('@trycompai/ui/avatar', () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarImage: () => null,
  AvatarFallback: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
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
  Section: ({ title, children }: { title?: string; children: ReactNode }) => (
    <section aria-label={title}>{children}</section>
  ),
  Spinner: () => <div role="status">loading</div>,
  Stack: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

// The pager arrows carry only icons — give them distinct text so the buttons
// have stable accessible names to query by.
vi.mock('@trycompai/design-system/icons', () => ({
  ChevronLeft: () => <span>prev</span>,
  ChevronRight: () => <span>next</span>,
}));

vi.mock('lucide-react', () => ({
  ActivityIcon: () => <span>activity</span>,
  ChevronDownIcon: () => <span>down</span>,
  ChevronRightIcon: () => <span>right</span>,
}));

// Import AFTER the mocks so the component picks up the stubs.
import { RecentAuditLogs } from './RecentAuditLogs';

/**
 * Minimal fixture — RecentAuditLogs only reads id / description / timestamp /
 * user / data, so we cast the trimmed shape through `unknown` (no `any`).
 */
function makeLog(id: string): AuditLogWithRelations {
  return {
    id,
    timestamp: new Date('2026-07-21T12:00:00Z'),
    description: 'Updated vendor',
    userId: 'usr_abcdef',
    memberId: 'mem_1',
    organizationId: 'org_1',
    entityId: 'vnd_1',
    entityType: 'vendor',
    data: {},
    user: { id: 'usr_abcdef', name: 'Test User', image: null, role: 'employee' },
    member: null,
    organization: {},
  } as unknown as AuditLogWithRelations;
}

const makeLogs = (n: number) => Array.from({ length: n }, (_, i) => makeLog(`aud_${i}`));

describe('RecentAuditLogs', () => {
  it('shows an empty state when there are no logs', () => {
    render(<RecentAuditLogs logs={[]} />);
    expect(
      screen.getByText('Activity will appear here when changes are made'),
    ).toBeInTheDocument();
  });

  it('does not show the empty state while a batch is loading (server mode)', () => {
    render(
      <RecentAuditLogs logs={[]} total={100} hasMore onLoadMore={vi.fn()} isLoadingMore />,
    );
    expect(
      screen.queryByText('Activity will appear here when changes are made'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('paginates a plain logs array (legacy, no server props)', () => {
    render(<RecentAuditLogs logs={makeLogs(20)} />);

    // 15 rows on page 1 of 2.
    expect(screen.getAllByText('Updated vendor')).toHaveLength(15);
    expect(screen.getByText('1–15 of 20')).toBeInTheDocument();

    const next = screen.getByRole('button', { name: 'next' });
    expect(next).toBeEnabled();
    fireEvent.click(next);

    // Remaining 5 rows on page 2; next now disabled at the genuine end.
    expect(screen.getAllByText('Updated vendor')).toHaveLength(5);
    expect(screen.getByText('16–20 of 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'next' })).toBeDisabled();
  });

  it('keeps the next arrow enabled from the server total, not the loaded count', () => {
    // Only 15 rows loaded, but the server says 100 exist. Legacy mode over 15
    // rows would render no pager (1 page); server mode must expose more pages.
    render(
      <RecentAuditLogs logs={makeLogs(15)} total={100} hasMore onLoadMore={vi.fn()} />,
    );

    expect(screen.getByText('of 100', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'next' })).toBeEnabled();
  });

  it('calls onLoadMore when paging past the loaded rows', () => {
    const onLoadMore = vi.fn();
    render(
      <RecentAuditLogs logs={makeLogs(15)} total={100} hasMore onLoadMore={onLoadMore} />,
    );

    // The first (full) page is already loaded — no fetch yet.
    expect(onLoadMore).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    // Paging to row 16+ crosses the loaded window → fetch the next batch.
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not call onLoadMore in legacy mode', () => {
    // Sanity: without server props, paging never triggers a fetch.
    render(<RecentAuditLogs logs={makeLogs(20)} />);
    fireEvent.click(screen.getByRole('button', { name: 'next' }));
    // No onLoadMore prop exists to call; nothing throws and the page advances.
    expect(screen.getByText('16–20 of 20')).toBeInTheDocument();
  });
});
