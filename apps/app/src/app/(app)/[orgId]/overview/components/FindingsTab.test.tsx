import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';
import type { Finding } from '@/hooks/use-findings-api';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ permissions: {}, hasPermission: mockHasPermission }),
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
  CreateFindingSheet: ({ open }: { open: boolean }) => (
    <div data-testid="create-sheet" data-open={open} />
  ),
}));

vi.mock('./FindingDetailSheet', () => ({
  FindingDetailSheet: ({ open }: { open: boolean }) => (
    <div data-testid="detail-sheet" data-open={open} />
  ),
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

describe('FindingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state when no findings are returned', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    mockUseOrganizationFindings.mockReturnValue({
      data: { data: [], status: 200 },
      mutate: vi.fn(),
    });

    render(<FindingsTab organizationId="org_1" />);

    expect(screen.getByText(/no findings yet/i)).toBeInTheDocument();
  });

  it('renders the linked item title', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    mockUseOrganizationFindings.mockReturnValue({
      data: { data: [makeFinding()], status: 200 },
      mutate: vi.fn(),
    });

    render(<FindingsTab organizationId="org_1" />);

    expect(screen.getByText(/task: upload mfa evidence/i)).toBeInTheDocument();
    expect(
      screen.getByText(/evidence missing a timestamp/i),
    ).toBeInTheDocument();
  });

  it('does not render the CreateFindingSheet mount for users without finding:create (admin)', () => {
    // Admins no longer have finding:create — sheet is only mounted for auditors
    setMockPermissions(ADMIN_PERMISSIONS);
    mockUseOrganizationFindings.mockReturnValue({
      data: { data: [], status: 200 },
      mutate: vi.fn(),
    });

    render(<FindingsTab organizationId="org_1" />);

    expect(screen.queryByTestId('create-sheet')).not.toBeInTheDocument();
  });

  it('renders the CreateFindingSheet mount for auditors', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    mockUseOrganizationFindings.mockReturnValue({
      data: { data: [], status: 200 },
      mutate: vi.fn(),
    });

    render(<FindingsTab organizationId="org_1" />);

    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();
  });
});
