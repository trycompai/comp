import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const deleteCommentMock = vi.fn();
vi.mock('@/hooks/use-comments-api', () => ({
  useCommentActions: () => ({
    updateComment: vi.fn(),
    deleteComment: deleteCommentMock,
  }),
}));

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({ get: vi.fn() }),
}));

vi.mock('@/hooks/use-mentionable-members', () => ({
  useMentionableMembers: () => ({ members: [], isLoading: false }),
}));

// Renders comment content as plain text — the real component mounts a full
// TipTap editor, which isn't needed to test the delete flow and doesn't
// play well with jsdom.
vi.mock('./CommentContentView', () => ({
  CommentContentView: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@trycompai/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <button onClick={onSelect}>{children}</button>
  ),
}));

vi.mock('@trycompai/design-system', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, disabled }: any) => (
    <button disabled={disabled}>{children}</button>
  ),
  AlertDialogAction: ({ children, onClick, loading }: any) => (
    <button onClick={onClick} disabled={loading}>
      {children}
    </button>
  ),
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: () => null,
}));

import { toast } from 'sonner';
import { CommentItem } from './CommentItem';
import type { CommentWithAuthor } from './Comments';

const baseComment: CommentWithAuthor = {
  id: 'cmt_1',
  content: 'Hello world',
  author: {
    id: 'usr_1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    image: null,
    deactivated: false,
  },
  attachments: [],
  createdAt: new Date().toISOString(),
};

async function openDeleteDialog() {
  fireEvent.click(screen.getByRole('button', { name: /comment options/i }));
  fireEvent.click(await screen.findByText('Delete'));
}

// The mocked dropdown menu (unlike the real Radix one) never unmounts its
// "Delete" item after selection, so once the confirmation dialog opens there
// are two "Delete" buttons on the page — scope to the dialog to click the
// confirm action specifically.
async function confirmDelete() {
  const dialog = await screen.findByTestId('alert-dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }));
}

describe('CommentItem delete error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the server-provided reason when deletion fails', async () => {
    deleteCommentMock.mockRejectedValue(
      new Error('You can only delete your own comments'),
    );

    render(
      <CommentItem
        comment={baseComment}
        refreshComments={vi.fn()}
        entityType="task"
      />,
    );

    await openDeleteDialog();
    await confirmDelete();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'You can only delete your own comments',
      );
    });
  });

  it('falls back to a generic message when the error has no message', async () => {
    deleteCommentMock.mockRejectedValue('not an Error instance');

    render(
      <CommentItem
        comment={baseComment}
        refreshComments={vi.fn()}
        entityType="task"
      />,
    );

    await openDeleteDialog();
    await confirmDelete();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete comment.');
    });
  });

  it('shows a success toast and refreshes on successful deletion', async () => {
    deleteCommentMock.mockResolvedValue({ success: true, status: 204 });
    const refreshComments = vi.fn();

    render(
      <CommentItem
        comment={baseComment}
        refreshComments={refreshComments}
        entityType="task"
      />,
    );

    await openDeleteDialog();
    await confirmDelete();

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Comment deleted successfully.');
    });
    expect(refreshComments).toHaveBeenCalled();
  });
});
