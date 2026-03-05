import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useKnowledgeBaseDocs
const mockUploadDocument = vi.fn();
const mockProcessDocuments = vi.fn();
const mockDeleteDocument = vi.fn();
const mockDownloadDocument = vi.fn();
const mockRevalidate = vi.fn();

vi.mock('../../../hooks/useKnowledgeBaseDocs', () => ({
  useKnowledgeBaseDocs: ({ fallbackData }: any) => ({
    documents: fallbackData || [],
    uploadDocument: mockUploadDocument,
    processDocuments: mockProcessDocuments,
    deleteDocument: mockDeleteDocument,
    downloadDocument: mockDownloadDocument,
    revalidate: mockRevalidate,
  }),
}));

// Mock useDocumentProcessing
vi.mock('../hooks/useDocumentProcessing', () => ({
  useDocumentProcessing: () => ({
    isProcessing: false,
    isDeleting: false,
  }),
}));

// Mock usePagination
vi.mock('../../hooks/usePagination', () => ({
  usePagination: ({ items }: any) => ({
    currentPage: 1,
    totalPages: 1,
    paginatedItems: items,
    handlePageChange: vi.fn(),
  }),
}));

// Mock FileUploader
vi.mock('@/components/file-uploader', () => ({
  FileUploader: (props: any) => (
    <div data-testid="file-uploader" data-disabled={props.disabled}>
      File Uploader
    </div>
  ),
}));

// Mock @comp/ui components
vi.mock('@comp/ui/accordion', () => ({
  Accordion: ({ children }: any) => <div data-testid="accordion">{children}</div>,
  AccordionContent: ({ children }: any) => <div data-testid="accordion-content">{children}</div>,
  AccordionItem: ({ children }: any) => <div>{children}</div>,
  AccordionTrigger: ({ children }: any) => <div data-testid="accordion-trigger">{children}</div>,
}));

vi.mock('@comp/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button data-testid="alert-dialog-action" onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left-icon" />,
  ChevronRight: () => <span data-testid="chevron-right-icon" />,
  Download: () => <span data-testid="download-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  Upload: () => <span data-testid="upload-icon" />,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 01, 2024',
}));

import { AdditionalDocumentsSection } from './AdditionalDocumentsSection';

const mockDocuments = [
  {
    id: 'doc-1',
    name: 'test-document.pdf',
    description: null,
    s3Key: 'docs/test-document.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    processingStatus: 'completed',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const defaultProps = {
  organizationId: 'org-1',
  documents: mockDocuments,
};

describe('AdditionalDocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('renders file uploader when user has questionnaire:create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(screen.getByTestId('file-uploader')).toBeInTheDocument();
    });

    it('does not render file uploader when user lacks questionnaire:create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(screen.queryByTestId('file-uploader')).not.toBeInTheDocument();
    });

    it('does not render file uploader when user has no permissions at all', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(screen.queryByTestId('file-uploader')).not.toBeInTheDocument();
    });

    it('checks the correct resource and action for permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(mockHasPermission).toHaveBeenCalledWith('questionnaire', 'create');
    });

    it('renders delete buttons for documents when user has questionnaire:create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('does not render delete buttons for documents when user lacks questionnaire:create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(screen.queryByTestId('trash-icon')).not.toBeInTheDocument();
    });

    it('still renders the accordion and document list without create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<AdditionalDocumentsSection {...defaultProps} />);

      expect(screen.getByTestId('accordion')).toBeInTheDocument();
      expect(screen.getByText('Additional Documents')).toBeInTheDocument();
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });
  });

  describe('Rendering with no documents', () => {
    it('does not render document list when there are no documents', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <AdditionalDocumentsSection organizationId="org-1" documents={[]} />,
      );

      expect(screen.queryByText('test-document.pdf')).not.toBeInTheDocument();
    });

    it('still renders file uploader when there are no documents and user has permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(
        <AdditionalDocumentsSection organizationId="org-1" documents={[]} />,
      );

      expect(screen.getByTestId('file-uploader')).toBeInTheDocument();
    });
  });
});
