import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@trycompai/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    title,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  ),
}));

// Evidence details aren't under test — keep jsdom out of its JSON viewer.
vi.mock('./EvidenceJsonView', () => ({
  EvidenceJsonView: () => <div data-testid="evidence-json" />,
}));

import type { StoredCheckRun } from '../hooks/useIntegrationChecks';
import type { RunExceptionActions } from './check-run-history';
import { CheckRunItem } from './check-run-history';

function buildRun(): StoredCheckRun {
  const now = new Date().toISOString();
  return {
    id: 'icr_1',
    checkId: 'aws-s3-bucket-public-access',
    checkName: 'S3 - public access blocked',
    status: 'failed',
    startedAt: now,
    completedAt: now,
    durationMs: 10,
    totalChecked: 3,
    passedCount: 1,
    failedCount: 1,
    exceptedCount: 1,
    connectionId: 'conn_1',
    connectionLabel: 'AWS 111111111111',
    provider: { slug: 'aws', name: 'AWS' },
    results: [
      {
        id: 'res_fail',
        passed: false,
        resourceType: 'aws-s3-bucket',
        resourceId: 'redirect-bucket',
        title: 'Public access not fully blocked: redirect-bucket',
        collectedAt: now,
      },
      {
        id: 'res_excepted',
        passed: false,
        resourceType: 'aws-s3-bucket',
        resourceId: 'assets-bucket',
        title: 'Public access not fully blocked: assets-bucket',
        collectedAt: now,
        excepted: true,
        exceptionId: 'fex_1',
        exceptionReason: 'Bucket only hosts a static website redirect.',
      },
      {
        id: 'res_pass',
        passed: true,
        resourceType: 'aws-s3-bucket',
        resourceId: 'private-bucket',
        title: 'Public access blocked: private-bucket',
        collectedAt: now,
      },
    ],
    createdAt: now,
  };
}

function buildActions(canManage = true): RunExceptionActions {
  return {
    canManage,
    onMarkOutOfScope: vi.fn(),
    onRevoke: vi.fn(),
  };
}

describe('CheckRunItem scope actions', () => {
  it('offers "Mark out of scope" on failing rows and reports the full target', () => {
    const actions = buildActions();
    render(
      <CheckRunItem
        run={buildRun()}
        isLatest
        organizationName="Acme"
        exceptionActions={actions}
      />,
    );

    const markButton = screen.getByRole('button', { name: 'Mark out of scope' });
    fireEvent.click(markButton);

    expect(actions.onMarkOutOfScope).toHaveBeenCalledWith({
      findingId: 'res_fail',
      title: 'Public access not fully blocked: redirect-bucket',
      resourceId: 'redirect-bucket',
      connectionId: 'conn_1',
      checkId: 'aws-s3-bucket-public-access',
    });
  });

  it('shows the excepted row with its reason and offers revoke with the exception id', () => {
    const actions = buildActions();
    render(
      <CheckRunItem
        run={buildRun()}
        isLatest
        organizationName="Acme"
        exceptionActions={actions}
      />,
    );

    expect(screen.getByText('Out of scope')).toBeInTheDocument();
    expect(
      screen.getByText('Bucket only hosts a static website redirect.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move back in scope' }));

    expect(actions.onRevoke).toHaveBeenCalledWith({
      findingId: 'res_excepted',
      title: 'Public access not fully blocked: assets-bucket',
      resourceId: 'assets-bucket',
      connectionId: 'conn_1',
      checkId: 'aws-s3-bucket-public-access',
      exceptionId: 'fex_1',
    });
  });

  it('hides both actions without the integration:update permission', () => {
    render(
      <CheckRunItem
        run={buildRun()}
        isLatest
        organizationName="Acme"
        exceptionActions={buildActions(false)}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Mark out of scope' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Move back in scope' }),
    ).not.toBeInTheDocument();
    // Read-only users still see the excepted state + reason.
    expect(screen.getByText('Out of scope')).toBeInTheDocument();
  });

  it('hides both actions on non-latest runs (stale resources)', () => {
    render(
      <CheckRunItem
        run={buildRun()}
        isLatest={false}
        organizationName="Acme"
        exceptionActions={buildActions()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Mark out of scope' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Move back in scope' }),
    ).not.toBeInTheDocument();
  });

  it('expands beyond the first three failing rows so every sampled resource is markable', () => {
    const actions = buildActions();
    const run = buildRun();
    const now = new Date().toISOString();
    // 5 sampled failing rows (plus the excepted one from the base fixture).
    run.results = Array.from({ length: 5 }, (_, i) => ({
      id: `res_fail_${i}`,
      passed: false,
      resourceType: 'aws-s3-bucket',
      resourceId: `bucket-${i}`,
      title: `Public access not fully blocked: bucket-${i}`,
      collectedAt: now,
    }));
    run.failedCount = 5;
    run.exceptedCount = 0;

    render(
      <CheckRunItem run={run} isLatest organizationName="Acme" exceptionActions={actions} />,
    );

    // Collapsed: only the first three rows are actionable.
    expect(screen.getAllByRole('button', { name: 'Mark out of scope' })).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more issues' }));

    // Expanded: every sampled failing row is actionable.
    expect(screen.getAllByRole('button', { name: 'Mark out of scope' })).toHaveLength(5);
    expect(
      screen.queryByRole('button', { name: /Show .* more issues/ }),
    ).not.toBeInTheDocument();
  });

  it('renders no actions at all when none are provided (other callers unaffected)', () => {
    render(<CheckRunItem run={buildRun()} isLatest organizationName="Acme" />);

    expect(
      screen.queryByRole('button', { name: 'Mark out of scope' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Move back in scope' }),
    ).not.toBeInTheDocument();
  });
});
