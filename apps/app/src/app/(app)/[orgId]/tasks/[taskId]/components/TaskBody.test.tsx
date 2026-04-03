import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the task API hooks
const mockRefreshAttachments = vi.fn();
const mockUploadAttachment = vi.fn();
const mockGetDownloadUrl = vi.fn();
const mockDeleteAttachment = vi.fn();

vi.mock('@/hooks/use-tasks-api', () => ({
  useTaskAttachments: vi.fn(),
  useTaskAttachmentActions: vi.fn(() => ({
    uploadAttachment: mockUploadAttachment,
    getDownloadUrl: mockGetDownloadUrl,
    deleteAttachment: mockDeleteAttachment,
  })),
}));

// Mock UI components to simplify rendering
vi.mock('@trycompai/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock('@trycompai/ui/dialog', () => ({
  Dialog: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

import { useTaskAttachments } from '@/hooks/use-tasks-api';
import { TaskBody } from './TaskBody';

const mockUseTaskAttachments = vi.mocked(useTaskAttachments);

describe('TaskBody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show upload dropzone even when attachments are loading', () => {
    mockUseTaskAttachments.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: mockRefreshAttachments,
      isValidating: false,
    });

    render(<TaskBody taskId="tsk_123" />);

    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
  });

  it('should show upload dropzone when attachments data is undefined (SWR key is null)', () => {
    mockUseTaskAttachments.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: mockRefreshAttachments,
      isValidating: false,
    });

    render(<TaskBody taskId="tsk_123" />);

    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
  });

  it('should show upload dropzone when attachments have loaded successfully', () => {
    mockUseTaskAttachments.mockReturnValue({
      data: { data: [], status: 200 } as never,
      error: undefined,
      isLoading: false,
      mutate: mockRefreshAttachments,
      isValidating: false,
    });

    render(<TaskBody taskId="tsk_123" />);

    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
  });

  it('should show upload dropzone when attachments fail to load', () => {
    mockUseTaskAttachments.mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch'),
      isLoading: false,
      mutate: mockRefreshAttachments,
      isValidating: false,
    });

    render(<TaskBody taskId="tsk_123" />);

    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
    expect(screen.getByText('Failed to load attachments. Please try again.')).toBeInTheDocument();
  });

  it('should show loading skeletons while attachments are loading', () => {
    mockUseTaskAttachments.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      mutate: mockRefreshAttachments,
      isValidating: false,
    });

    const { container } = render(<TaskBody taskId="tsk_123" />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('should not show loading skeletons when attachments have loaded', () => {
    mockUseTaskAttachments.mockReturnValue({
      data: { data: [], status: 200 } as never,
      error: undefined,
      isLoading: false,
      mutate: mockRefreshAttachments,
      isValidating: false,
    });

    const { container } = render(<TaskBody taskId="tsk_123" />);

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(0);
  });
});
