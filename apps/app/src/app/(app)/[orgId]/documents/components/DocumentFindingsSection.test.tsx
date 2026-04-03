import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FindingStatus, FindingType } from '@db';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// ─── Mocks ───────────────────────────────────────────────────

const mockUpdateFinding = vi.fn();
const mockDeleteFinding = vi.fn();
const mockMutate = vi.fn();

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mutable mock data for useFormTypeFindings
let mockFindingsReturn: {
  data: { data: unknown[] } | null;
  isLoading: boolean;
  error: unknown;
  mutate: ReturnType<typeof vi.fn>;
} = {
  data: null,
  isLoading: false,
  error: null,
  mutate: mockMutate,
};

// Mock the findings hooks
vi.mock('@/hooks/use-findings-api', () => ({
  useFormTypeFindings: () => mockFindingsReturn,
  useFindingActions: () => ({
    updateFinding: mockUpdateFinding,
    deleteFinding: mockDeleteFinding,
  }),
}));

// Mock the CreateFindingButton
vi.mock(
  '../../tasks/[taskId]/components/findings/CreateFindingButton',
  () => ({
    CreateFindingButton: ({
      evidenceFormType,
    }: {
      evidenceFormType: string;
    }) => (
      <button data-testid="create-finding-btn">
        Create Finding ({evidenceFormType})
      </button>
    ),
  }),
);

// Mock the FindingItem component
vi.mock('../../tasks/[taskId]/components/findings/FindingItem', () => ({
  FindingItem: ({
    finding,
    canChangeStatus,
    canSetRestrictedStatus,
    isAuditor,
  }: {
    finding: { id: string };
    canChangeStatus: boolean;
    canSetRestrictedStatus: boolean;
    isAuditor: boolean;
  }) => (
    <div data-testid={`finding-item-${finding.id}`}>
      <span data-testid="can-change-status">
        {String(canChangeStatus)}
      </span>
      <span data-testid="can-set-restricted-status">
        {String(canSetRestrictedStatus)}
      </span>
      <span data-testid="is-auditor">{String(isAuditor)}</span>
    </div>
  ),
}));

// Mock design-system icons
vi.mock('@trycompai/design-system/icons', () => ({
  ChevronDown: ({ size }: any) => <span data-testid="chevron-down" />,
  ChevronUp: ({ size }: any) => <span data-testid="chevron-up" />,
  WarningAlt: ({ size, className }: any) => (
    <span data-testid="warning-alt-icon" />
  ),
  WarningAltFilled: ({ size, className }: any) => (
    <span data-testid="warning-alt-filled-icon" />
  ),
}));

// Mock design-system Button
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { DocumentFindingsSection } from './DocumentFindingsSection';

// ─── Helpers ─────────────────────────────────────────────────

function makeFinding(
  overrides: Partial<{
    id: string;
    status: FindingStatus;
    content: string;
  }> = {},
) {
  return {
    id: overrides.id ?? 'finding-1',
    type: 'soc2' as FindingType,
    status: overrides.status ?? FindingStatus.open,
    content: overrides.content ?? 'Test finding content',
    revisionNote: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    taskId: null,
    evidenceSubmissionId: null,
    evidenceFormType: null,
    templateId: null,
    createdById: 'user-1',
    organizationId: 'org-1',
    createdBy: {
      id: 'member-1',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
    },
    template: null,
    task: null,
    evidenceSubmission: null,
  };
}

function setupFindingsData(findings: ReturnType<typeof makeFinding>[]) {
  mockFindingsReturn = {
    data: { data: findings },
    isLoading: false,
    error: null,
    mutate: mockMutate,
  };
}

function setupEmptyFindings() {
  mockFindingsReturn = {
    data: { data: [] },
    isLoading: false,
    error: null,
    mutate: mockMutate,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('DocumentFindingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEmptyFindings();
  });

  describe('Admin user (full permissions)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the findings section with header', () => {
      render(<DocumentFindingsSection formType="access-request" />);

      expect(screen.getByText('Findings')).toBeInTheDocument();
      expect(
        screen.getByText('Audit findings and issues requiring attention'),
      ).toBeInTheDocument();
    });

    it('shows the Create Finding button when user has finding:create', () => {
      render(<DocumentFindingsSection formType="access-request" />);

      expect(screen.getByTestId('create-finding-btn')).toBeInTheDocument();
    });

    it('shows the empty state with create prompt when no findings', () => {
      render(<DocumentFindingsSection formType="access-request" />);

      expect(
        screen.getByText('No findings for this document'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Create a finding to flag an issue'),
      ).toBeInTheDocument();
    });

    it('renders finding items with canChangeStatus=true', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(
        screen.getByTestId('finding-item-finding-1'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('can-change-status')).toHaveTextContent(
        'true',
      );
    });

    it('passes canSetRestrictedStatus=true to finding items', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(
        screen.getByTestId('can-set-restricted-status'),
      ).toHaveTextContent('true');
    });

    it('checks the correct permissions for findings', () => {
      render(<DocumentFindingsSection formType="access-request" />);

      expect(mockHasPermission).toHaveBeenCalledWith('finding', 'create');
      expect(mockHasPermission).toHaveBeenCalledWith('finding', 'update');
    });
  });

  describe('Auditor user (read-only)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('does NOT show Create Finding button (auditor lacks finding:create)', () => {
      // Auditor has read + export but not create for findings
      const hasCreate = mockHasPermission('finding', 'create');

      if (hasCreate) {
        // If auditor DOES have finding:create, it should render the button
        render(<DocumentFindingsSection formType="access-request" />);
        expect(
          screen.getByTestId('create-finding-btn'),
        ).toBeInTheDocument();
      } else {
        // If auditor does NOT have finding:create, button should be hidden
        setupFindingsData([makeFinding()]);
        render(<DocumentFindingsSection formType="access-request" />);
        expect(
          screen.queryByTestId('create-finding-btn'),
        ).not.toBeInTheDocument();
      }
    });

    it('returns null when no findings and no create permission', () => {
      const hasCreate = mockHasPermission('finding', 'create');

      if (!hasCreate) {
        setupEmptyFindings();
        const { container } = render(
          <DocumentFindingsSection formType="access-request" />,
        );
        expect(container.innerHTML).toBe('');
      }
    });

    it('renders findings read-only when findings exist', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(screen.getByText('Findings')).toBeInTheDocument();
      expect(
        screen.getByTestId('finding-item-finding-1'),
      ).toBeInTheDocument();
    });

    it('passes canChangeStatus based on finding:update permission', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      const hasUpdate = mockHasPermission('finding', 'update');
      expect(screen.getByTestId('can-change-status')).toHaveTextContent(
        String(hasUpdate),
      );
    });
  });

  describe('No permissions at all', () => {
    beforeEach(() => {
      setMockPermissions(NO_PERMISSIONS);
    });

    it('returns null when no findings exist and no create permission', () => {
      setupEmptyFindings();

      const { container } = render(
        <DocumentFindingsSection formType="access-request" />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('does NOT show Create Finding button even when findings exist', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(
        screen.queryByTestId('create-finding-btn'),
      ).not.toBeInTheDocument();
    });

    it('passes canChangeStatus=false when no finding:update', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(screen.getByTestId('can-change-status')).toHaveTextContent(
        'false',
      );
    });

    it('passes canSetRestrictedStatus=false when no finding:update', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(
        screen.getByTestId('can-set-restricted-status'),
      ).toHaveTextContent('false');
    });

    it('renders findings section in read-only when findings exist', () => {
      setupFindingsData([makeFinding()]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(screen.getByText('Findings')).toBeInTheDocument();
    });
  });

  describe('Open findings badge', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('shows count badge when open findings exist', () => {
      setupFindingsData([
        makeFinding({ id: 'f1', status: FindingStatus.open }),
        makeFinding({ id: 'f2', status: FindingStatus.needs_revision }),
        makeFinding({ id: 'f3', status: FindingStatus.closed }),
      ]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(screen.getByText('2 requires action')).toBeInTheDocument();
    });

    it('does not show count badge when no open findings', () => {
      setupFindingsData([
        makeFinding({ id: 'f1', status: FindingStatus.closed }),
      ]);

      render(<DocumentFindingsSection formType="access-request" />);

      expect(
        screen.queryByText(/requires action/),
      ).not.toBeInTheDocument();
    });
  });
});
