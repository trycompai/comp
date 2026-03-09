import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => '/org-1/policies/policy-1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ orgId: 'org-1', policyId: 'policy-1' })),
}));

// Mock usePolicy hook
const mockMutate = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: ({ initialData }: { initialData: unknown }) => ({
    policy: initialData,
    mutate: mockMutate,
    updatePolicy: vi.fn(),
    deletePolicy: vi.fn(),
    archivePolicy: vi.fn(),
    acceptChanges: vi.fn(),
    denyChanges: vi.fn(),
    addControlMappings: vi.fn(),
    removeControlMapping: vi.fn(),
  }),
}));

// Mock usePolicyVersions hook
const mockMutateVersions = vi.fn();
vi.mock('../hooks/usePolicyVersions', () => ({
  usePolicyVersions: ({ initialData }: { initialData: unknown }) => ({
    versions: initialData ?? [],
    mutate: mockMutateVersions,
    createVersion: vi.fn(),
    deleteVersion: vi.fn(),
    submitForApproval: vi.fn(),
    updateVersionContent: vi.fn(),
  }),
}));

// Mock useAuditLogs hook
vi.mock('../hooks/useAuditLogs', () => ({
  useAuditLogs: ({ initialData }: { initialData: unknown }) => ({
    logs: initialData ?? [],
    mutate: vi.fn(),
  }),
}));

// Mock child components to isolate testing
vi.mock('./PolicyAlerts', () => ({
  PolicyAlerts: ({ policy }: { policy: unknown }) => (
    <div data-testid="policy-alerts">{policy ? 'alerts' : 'no-alerts'}</div>
  ),
}));

vi.mock('./PolicyArchiveSheet', () => ({
  PolicyArchiveSheet: () => <div data-testid="policy-archive-sheet" />,
}));

vi.mock('./PolicyControlMappings', () => ({
  PolicyControlMappings: () => <div data-testid="policy-control-mappings" />,
}));

vi.mock('./PolicyDeleteDialog', () => ({
  PolicyDeleteDialog: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="policy-delete-dialog" data-open={isOpen} />
  ),
}));

vi.mock('./PolicyOverviewSheet', () => ({
  PolicyOverviewSheet: () => <div data-testid="policy-overview-sheet" />,
}));

vi.mock('./PolicySettingsCard', () => ({
  PolicySettingsCard: () => <div data-testid="policy-settings-card" />,
}));

vi.mock('./PolicyVersionsTab', () => ({
  PolicyVersionsTab: () => <div data-testid="policy-versions-tab" />,
}));

vi.mock('./RecentAuditLogs', () => ({
  RecentAuditLogs: () => <div data-testid="recent-audit-logs" />,
}));

vi.mock('../../../../../../components/comments/Comments', () => ({
  Comments: () => <div data-testid="comments" />,
}));

vi.mock('../editor/components/PolicyDetails', () => ({
  PolicyContentManager: () => <div data-testid="policy-content-manager" />,
}));

import { PolicyPageTabs } from './PolicyPageTabs';

const basePolicy = {
  id: 'policy-1',
  name: 'Test Policy',
  organizationId: 'org-1',
  status: 'draft',
  content: null,
  description: null,
  isArchived: false,
  departmentId: null,
  department: null,
  frequency: null,
  approverId: null,
  assigneeId: null,
  currentVersionId: null,
  pendingVersionId: null,
  lastPublishedAt: null,
  reviewDate: null,
  pdfUrl: null,
  displayFormat: 'EDITOR',
  draftContent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  approver: null,
} as any;

const defaultProps = {
  policy: basePolicy,
  assignees: [],
  mappedControls: [],
  allControls: [],
  isPendingApproval: false,
  policyId: 'policy-1',
  organizationId: 'org-1',
  logs: [],
  versions: [],
  showAiAssistant: false,
} as any;

describe('PolicyPageTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders all tabs', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('renders PolicyAlerts component', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByTestId('policy-alerts')).toBeInTheDocument();
    });

    it('renders child sheet/dialog components when policy exists', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByTestId('policy-overview-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('policy-archive-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('policy-delete-dialog')).toBeInTheDocument();
    });

    it('renders overview tab content by default', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByTestId('policy-settings-card')).toBeInTheDocument();
      expect(
        screen.getByTestId('policy-control-mappings'),
      ).toBeInTheDocument();
    });
  });

  describe('auditor permissions', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('still renders all tabs (tabs are not permission-gated)', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Versions')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('renders the overview tab content (child components handle their own gating)', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByTestId('policy-settings-card')).toBeInTheDocument();
      expect(
        screen.getByTestId('policy-control-mappings'),
      ).toBeInTheDocument();
    });

    it('still renders sheets/dialogs (they handle own permission checks)', () => {
      render(<PolicyPageTabs {...defaultProps} />);
      expect(screen.getByTestId('policy-overview-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('policy-archive-sheet')).toBeInTheDocument();
      expect(screen.getByTestId('policy-delete-dialog')).toBeInTheDocument();
    });
  });

  describe('null policy', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('does not render sheets/dialogs when policy is null', () => {
      render(<PolicyPageTabs {...defaultProps} policy={null} />);
      expect(
        screen.queryByTestId('policy-overview-sheet'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('policy-archive-sheet'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('policy-delete-dialog'),
      ).not.toBeInTheDocument();
    });
  });
});
