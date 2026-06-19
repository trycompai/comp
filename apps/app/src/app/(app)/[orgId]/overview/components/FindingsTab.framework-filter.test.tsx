import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { Finding } from '@/hooks/use-findings-api';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ permissions: {}, hasPermission: mockHasPermission }),
}));

// Drives the framework filter options: FindingsTab fetches
// `/v1/frameworks?includeScores=false` via useApiSWR and derives the filter
// options from whichever frameworks the org has enabled.
const mockUseApiSWR = vi.fn();
vi.mock('@/hooks/use-api-swr', () => ({
  useApiSWR: (...args: unknown[]) => mockUseApiSWR(...args),
}));

const mockUseOrganizationFindings = vi.fn();
vi.mock('@/hooks/use-findings-api', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/use-findings-api')>(
    '@/hooks/use-findings-api',
  );
  return {
    ...actual,
    useOrganizationFindings: (...args: unknown[]) =>
      mockUseOrganizationFindings(...args),
  };
});

vi.mock('./CreateFindingSheet', () => ({
  CreateFindingSheet: () => <div data-testid="create-sheet" />,
}));

vi.mock('./FindingDetailSheet', () => ({
  FindingDetailSheet: () => <div data-testid="detail-sheet" />,
}));

// Render the design-system Select inline. Radix portals its content, so the
// options are otherwise hidden until the trigger is opened; flattening them
// keeps the dropdown options queryable.
vi.mock('@trycompai/design-system', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
  Empty: ({ children }: any) => <div>{children}</div>,
  EmptyDescription: ({ children }: any) => <p>{children}</p>,
  EmptyHeader: ({ children }: any) => <div>{children}</div>,
  EmptyMedia: ({ children }: any) => <div>{children}</div>,
  EmptyTitle: ({ children }: any) => <h3>{children}</h3>,
  InputGroup: ({ children }: any) => <div>{children}</div>,
  InputGroupAddon: ({ children }: any) => <span>{children}</span>,
  InputGroupInput: (props: any) => <input {...props} />,
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <button data-value={value}>{children}</button>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children, placeholder }: any) => (
    <span>{children ?? placeholder}</span>
  ),
  Stack: ({ children }: any) => <div>{children}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children, onClick }: any) => <tr onClick={onClick}>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Search: () => <span data-testid="search-icon" />,
  WarningAlt: () => <span data-testid="warning-icon" />,
}));

import { FindingsTab } from './FindingsTab';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'fnd_1',
    type: 'soc2',
    status: 'open',
    severity: 'medium',
    content: 'Evidence missing a timestamp',
    revisionNote: null,
    area: null,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-02T00:00:00Z',
    taskId: 'tsk_1',
    evidenceSubmissionId: null,
    evidenceFormType: null,
    policyId: null,
    vendorId: null,
    riskId: null,
    memberId: null,
    deviceId: null,
    templateId: null,
    createdById: 'mem_1',
    organizationId: 'org_1',
    createdBy: null,
    createdByAdmin: null,
    template: null,
    task: { id: 'tsk_1', title: 'Upload MFA evidence' },
    evidenceSubmission: null,
    policy: null,
    vendor: null,
    risk: null,
    member: null,
    device: null,
    ...overrides,
  };
}

/**
 * Stub the `/v1/frameworks` response to mark `names` as the org's enabled
 * frameworks. Mirrors the wrapped shape useApiSWR returns:
 * `{ data: { data: [...], count } }`.
 */
function setEnabledFrameworks(names: string[]) {
  const rows = names.map((name) => ({ framework: { name } }));
  mockUseApiSWR.mockReturnValue({
    data: { data: { data: rows, count: rows.length } },
  });
}

describe('FindingsTab framework filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockPermissions(AUDITOR_PERMISSIONS);
    mockUseOrganizationFindings.mockReturnValue({
      data: { data: [makeFinding()], status: 200 },
      mutate: vi.fn(),
    });
  });

  it('offers every framework the org has enabled, not a hardcoded SOC 2 / ISO 27001 pair', () => {
    // Repro for CS-554: Aiden Risk has SOC 2 + ISO 42001 enabled (no ISO 27001).
    setEnabledFrameworks(['SOC 2', 'ISO 42001']);

    render(<FindingsTab organizationId="org_1" />);

    // "All frameworks" labels both the trigger's current value and the reset
    // option, so it renders more than once.
    expect(screen.getAllByText('All frameworks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SOC 2')).toBeInTheDocument();
    // The bug: ISO 42001 findings could not be filtered because the filter
    // list was hardcoded to SOC 2 / ISO 27001.
    expect(screen.getByText('ISO 42001')).toBeInTheDocument();
    // ISO 27001 is NOT enabled for this org, so it must not be offered — the
    // old hardcoded list wrongly included it.
    expect(screen.queryByText('ISO 27001')).not.toBeInTheDocument();
  });

  it('offers HIPAA and GDPR when those are the enabled frameworks', () => {
    setEnabledFrameworks(['HIPAA', 'GDPR']);

    render(<FindingsTab organizationId="org_1" />);

    expect(screen.getByText('HIPAA')).toBeInTheDocument();
    expect(screen.getByText('GDPR')).toBeInTheDocument();
    expect(screen.queryByText('SOC 2')).not.toBeInTheDocument();
    expect(screen.queryByText('ISO 27001')).not.toBeInTheDocument();
  });
});
