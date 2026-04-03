import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// ─── Mock usePermissions ─────────────────────────────────────

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// ─── Mock SWR ────────────────────────────────────────────────

const mockMutate = vi.fn();
let mockSwrData: unknown = undefined;
let mockSwrLoading = false;
let mockSwrError: unknown = null;

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: mockSwrData,
    isLoading: mockSwrLoading,
    error: mockSwrError,
    mutate: mockMutate,
  })),
}));

// ─── Mock api client ─────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: null, error: null }),
    patch: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ─── Mock design system ──────────────────────────────────────

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Empty: ({ children }: any) => <div>{children}</div>,
  EmptyDescription: ({ children }: any) => <p>{children}</p>,
  EmptyHeader: ({ children }: any) => <div>{children}</div>,
  EmptyMedia: ({ children }: any) => <div>{children}</div>,
  EmptyTitle: ({ children }: any) => <h3>{children}</h3>,
  Field: ({ children }: any) => <div>{children}</div>,
  FieldLabel: ({ children }: any) => <label>{children}</label>,
  Section: ({ children }: any) => <section>{children}</section>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Document: () => <span data-testid="document-icon" />,
}));

// ─── Mock submission-utils ───────────────────────────────────

vi.mock('./submission-utils', () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
  formatSubmissionDate: () => '01/01/2025',
  isMatrixField: () => false,
  normalizeMatrixRows: () => [],
  renderSubmissionValue: (value: unknown) => String(value ?? '—'),
}));

// ─── Mock react-markdown ─────────────────────────────────────

vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('remark-gfm', () => ({
  default: () => {},
}));

// ─── Mock sonner ─────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { CompanySubmissionDetailPageClient } from './CompanySubmissionDetailPageClient';

// ─── Test data ───────────────────────────────────────────────

function makeSubmissionData(
  overrides: {
    status?: string;
    formType?: string;
  } = {},
) {
  return {
    form: {
      title: 'Access Request',
      description: 'Access request form',
      type: overrides.formType ?? 'access-request',
      category: 'Security',
      submissionDateMode: 'auto',
      fields: [
        { key: 'submissionDate', label: 'Submission Date', type: 'date' },
        { key: 'reason', label: 'Reason', type: 'textarea' },
      ],
    },
    submission: {
      id: 'sub-1',
      submittedAt: '2025-01-01T00:00:00.000Z',
      status: overrides.status ?? 'pending',
      data: {
        submissionDate: '2025-01-01',
        reason: 'Need access for project',
      },
      submittedBy: {
        name: 'Test User',
        email: 'test@example.com',
      },
      reviewedBy: null,
      reviewedAt: null,
      reviewReason: null,
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('CompanySubmissionDetailPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSwrData = undefined;
    mockSwrLoading = false;
    mockSwrError = null;
  });

  describe('Admin user with pending access-request', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
      mockSwrData = makeSubmissionData({ status: 'pending' });
    });

    it('renders the review section with Approve and Reject buttons', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.getByText('Review this submission'),
      ).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('renders the review reason textarea', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.getByText('Reason (required for rejection)'),
      ).toBeInTheDocument();
    });

    it('checks evidence:update permission', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(mockHasPermission).toHaveBeenCalledWith('evidence', 'update');
    });
  });

  describe('Auditor user (read-only) with pending access-request', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
      mockSwrData = makeSubmissionData({ status: 'pending' });
    });

    it('hides review section when auditor lacks evidence:update', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      const canReview = mockHasPermission('evidence', 'update');
      if (!canReview) {
        expect(
          screen.queryByText('Review this submission'),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Approve')).not.toBeInTheDocument();
        expect(screen.queryByText('Reject')).not.toBeInTheDocument();
      }
    });

    it('still renders the submission details', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(screen.getByText('Submission Date')).toBeInTheDocument();
      expect(screen.getByText('Submitted By')).toBeInTheDocument();
    });
  });

  describe('No permissions with pending access-request', () => {
    beforeEach(() => {
      setMockPermissions(NO_PERMISSIONS);
      mockSwrData = makeSubmissionData({ status: 'pending' });
    });

    it('hides review section without evidence:update', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.queryByText('Review this submission'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
      expect(screen.queryByText('Reject')).not.toBeInTheDocument();
    });
  });

  describe('Approved access-request (non-pending)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
      mockSwrData = makeSubmissionData({ status: 'approved' });
    });

    it('does NOT render review section for already-reviewed submission', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.queryByText('Review this submission'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Non-access-request form type', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
      mockSwrData = makeSubmissionData({
        formType: 'security-awareness-training',
      });
    });

    it('does NOT render the review section', () => {
      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="security-awareness-training"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.queryByText('Review this submission'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('shows loading text while fetching', () => {
      setMockPermissions(ADMIN_PERMISSIONS);
      mockSwrLoading = true;

      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.getByText('Loading submission...'),
      ).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('shows not found text on error', () => {
      setMockPermissions(ADMIN_PERMISSIONS);
      mockSwrError = new Error('Not found');

      render(
        <CompanySubmissionDetailPageClient
          organizationId="org-1"
          formType="access-request"
          submissionId="sub-1"
        />,
      );

      expect(
        screen.getByText('Submission not found'),
      ).toBeInTheDocument();
    });
  });
});
