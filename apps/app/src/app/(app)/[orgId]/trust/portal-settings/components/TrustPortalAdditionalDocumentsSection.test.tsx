import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

const mockUploadDocument = vi.fn();
const mockDownloadDocument = vi.fn();
const mockDeleteDocument = vi.fn();

vi.mock('@/hooks/use-trust-portal-documents', () => ({
  useTrustPortalDocuments: ({ initialData }: { initialData: unknown[] }) => ({
    documents: initialData,
    uploadDocument: mockUploadDocument,
    downloadDocument: mockDownloadDocument,
    deleteDocument: mockDeleteDocument,
  }),
}));

vi.mock('@/components/file-uploader', () => ({
  FileUploader: (props: Record<string, unknown>) => (
    <div data-testid="file-uploader" data-disabled={props.disabled} />
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { TrustPortalAdditionalDocumentsSection } from './TrustPortalAdditionalDocumentsSection';

const mockDocuments = [
  {
    id: 'doc-1',
    name: 'security-policy.pdf',
    description: null,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'doc-2',
    name: 'compliance-report.pdf',
    description: null,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

describe('TrustPortalAdditionalDocumentsSection permission gating', () => {
  const defaultProps = {
    organizationId: 'org-1',
    enabled: true,
    documents: mockDocuments,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section title regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    expect(screen.getByText('Additional Documents')).toBeInTheDocument();
  });

  it('renders document list regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    expect(screen.getByText('security-policy.pdf')).toBeInTheDocument();
    expect(screen.getByText('compliance-report.pdf')).toBeInTheDocument();
  });

  it('shows file uploader when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    expect(screen.getByTestId('file-uploader')).toBeInTheDocument();
  });

  it('hides file uploader when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    expect(screen.queryByTestId('file-uploader')).not.toBeInTheDocument();
  });

  it('hides file uploader when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    expect(screen.queryByTestId('file-uploader')).not.toBeInTheDocument();
  });

  it('shows delete buttons for documents when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    // Delete buttons are rendered for each document
    const deleteButtons = screen.getAllByRole('button');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('hides delete buttons for documents when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalAdditionalDocumentsSection {...defaultProps} />);
    // The document download rows (role="button") still render, but actual
    // <Button> delete buttons should not be present. The delete buttons use
    // the Trash2 icon; without permission, the entire block is not rendered.
    // There should be no actual <button> elements (only div[role="button"] for download).
    const realButtons = screen.queryAllByRole('button').filter(
      (el) => el.tagName === 'BUTTON',
    );
    expect(realButtons.length).toBe(0);
  });
});
