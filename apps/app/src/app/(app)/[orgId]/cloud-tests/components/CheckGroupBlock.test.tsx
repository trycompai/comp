import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Finding } from '../types';
import type { CheckGroup } from './check-groups';
import { CheckGroupBlock } from './CheckGroupBlock';

function makeFinding(overrides: Partial<Finding>): Finding {
  return {
    id: `icx_${Math.random().toString(36).slice(2, 8)}`,
    title: 'A finding',
    description: null,
    remediation: null,
    status: 'failed',
    severity: 'medium',
    serviceId: 'iam',
    findingKey: null,
    resourceId: null,
    resourceType: null,
    checkId: null,
    checkKey: 'iam-test',
    evidence: null,
    projectDisplayName: null,
    completedAt: null,
    connectionId: 'icn_test',
    providerSlug: 'aws',
    integration: { integrationId: 'aws' },
    ...overrides,
  };
}

function makeGroup(overrides: Partial<CheckGroup> = {}): CheckGroup {
  const failed = overrides.failed ?? [
    makeFinding({ id: 'f1', status: 'failed', resourceId: 'r1' }),
  ];
  const passed = overrides.passed ?? [];
  return {
    checkKey: 'iam-test',
    checkTitle: 'IAM users have MFA enabled',
    failed,
    passed,
    all: [...failed, ...passed],
    severity: 'high',
    ...overrides,
  };
}

describe('CheckGroupBlock', () => {
  it('renders the check title and failing/total count', () => {
    const group = makeGroup({
      failed: [
        makeFinding({ id: 'f1', status: 'failed' }),
        makeFinding({ id: 'f2', status: 'failed' }),
      ],
      passed: [
        makeFinding({ id: 'p1', status: 'passed' }),
        makeFinding({ id: 'p2', status: 'passed' }),
        makeFinding({ id: 'p3', status: 'passed' }),
      ],
    });
    render(
      <CheckGroupBlock
        group={group}
        severityFilter={null}
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    expect(screen.getByText('IAM users have MFA enabled')).toBeInTheDocument();
    expect(screen.getByText(/2 of 5 failing/i)).toBeInTheDocument();
  });

  it('renders only failing rows by default', () => {
    const group = makeGroup({
      failed: [makeFinding({ id: 'f1', status: 'failed' })],
      passed: [
        makeFinding({ id: 'p1', status: 'passed' }),
        makeFinding({ id: 'p2', status: 'passed' }),
      ],
    });
    render(
      <CheckGroupBlock
        group={group}
        severityFilter={null}
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    expect(screen.getByTestId('row-f1')).toBeInTheDocument();
    expect(screen.queryByTestId('row-p1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-p2')).not.toBeInTheDocument();
  });

  it('reveals passing rows when "Show all" is clicked', () => {
    const group = makeGroup({
      failed: [makeFinding({ id: 'f1', status: 'failed' })],
      passed: [
        makeFinding({ id: 'p1', status: 'passed' }),
        makeFinding({ id: 'p2', status: 'passed' }),
      ],
    });
    render(
      <CheckGroupBlock
        group={group}
        severityFilter={null}
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /show all 3 results/i }));
    expect(screen.getByTestId('row-f1')).toBeInTheDocument();
    expect(screen.getByTestId('row-p1')).toBeInTheDocument();
    expect(screen.getByTestId('row-p2')).toBeInTheDocument();
  });

  it('renders compact all-passing line when no failures and no severity filter', () => {
    const group = makeGroup({
      failed: [],
      passed: [
        makeFinding({ id: 'p1', status: 'passed' }),
        makeFinding({ id: 'p2', status: 'passed' }),
      ],
    });
    render(
      <CheckGroupBlock
        group={group}
        severityFilter={null}
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    expect(screen.getByText(/all 2 passing/i)).toBeInTheDocument();
    expect(screen.queryByTestId('row-p1')).not.toBeInTheDocument();
  });

  it('hides the check entirely when severity filter is active and there is no failure', () => {
    const group = makeGroup({
      failed: [],
      passed: [makeFinding({ id: 'p1', status: 'passed' })],
    });
    const { container } = render(
      <CheckGroupBlock
        group={group}
        severityFilter="critical"
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('filters failing rows by active severity filter', () => {
    const group = makeGroup({
      failed: [
        makeFinding({ id: 'f1', status: 'failed', severity: 'critical' }),
        makeFinding({ id: 'f2', status: 'failed', severity: 'medium' }),
      ],
      passed: [],
    });
    render(
      <CheckGroupBlock
        group={group}
        severityFilter="critical"
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    expect(screen.getByTestId('row-f1')).toBeInTheDocument();
    expect(screen.queryByTestId('row-f2')).not.toBeInTheDocument();
  });

  it('caps rendered rows at 100 and shows a Show-more affordance', () => {
    // 150 failing rows — only 100 should render initially.
    const failed = Array.from({ length: 150 }, (_, i) =>
      makeFinding({ id: `f${i}`, status: 'failed', resourceId: `r${i}` }),
    );
    const group = makeGroup({ failed, passed: [] });
    render(
      <CheckGroupBlock
        group={group}
        severityFilter={null}
        renderRow={(f) => <div data-testid={`row-${f.id}`}>{f.id}</div>}
      />,
    );
    // 100 rows rendered, 50 hidden behind a "Show more" button.
    expect(screen.getByTestId('row-f0')).toBeInTheDocument();
    expect(screen.getByTestId('row-f99')).toBeInTheDocument();
    expect(screen.queryByTestId('row-f100')).not.toBeInTheDocument();
    const showMore = screen.getByRole('button', {
      name: /show 50 more results/i,
    });
    expect(showMore).toBeInTheDocument();
    fireEvent.click(showMore);
    expect(screen.getByTestId('row-f100')).toBeInTheDocument();
    expect(screen.getByTestId('row-f149')).toBeInTheDocument();
  });
});
