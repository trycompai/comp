import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock SWR hooks ---
const mockMutate = vi.fn();
const mockVersionsData: { data: unknown[] | undefined; mutate: typeof mockMutate } = {
  data: [],
  mutate: mockMutate,
};
const mockDraftDiffData: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};

vi.mock('@/hooks/use-framework-versions', () => ({
  useFrameworkVersions: () => mockVersionsData,
}));

vi.mock('@/hooks/use-framework-draft-diff', () => ({
  useFrameworkDraftDiff: () => mockDraftDiffData,
}));

// --- Mock API client ---
const mockPost = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// --- Mock sonner ---
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// --- Mock @trycompai/design-system (all DS components used in the dialog) ---
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, disabled, loading, type, onClick, variant }: any) => (
    <button disabled={disabled || loading} type={type ?? 'button'} onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  Input: ({ id, ...props }: any) => <input id={id} {...props} />,
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
  Stack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
  Textarea: ({ id, ...props }: any) => <textarea id={id} {...props} />,
}));

import { PublishVersionDialog } from './PublishVersionDialog';

const DEFAULT_PROPS = {
  frameworkId: 'fw_test123',
  open: true,
  onClose: vi.fn(),
  latestVersion: '1.0.0',
};

function makeDiff(overrides?: Partial<{
  controlsAdded: number;
  requirementsAdded: number;
  policiesAdded: number;
  tasksAdded: number;
}>) {
  const { controlsAdded = 0, requirementsAdded = 0, policiesAdded = 0, tasksAdded = 0 } =
    overrides ?? {};
  return {
    latestVersion: { id: 'v_1', version: '1.0.0' },
    diff: {
      controls: { added: Array(controlsAdded).fill({}), removed: [], updated: [] },
      requirements: { added: Array(requirementsAdded).fill({}), removed: [], updated: [] },
      policies: { added: Array(policiesAdded).fill({}), removed: [], updated: [] },
      tasks: { added: Array(tasksAdded).fill({}), removed: [], updated: [] },
      requirementMapEdges: { added: [], removed: [] },
      controlPolicyEdges: { added: [], removed: [] },
      controlTaskEdges: { added: [], removed: [] },
    },
  };
}

describe('PublishVersionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DEFAULT_PROPS.onClose = vi.fn();
    mockVersionsData.data = [];
    mockVersionsData.mutate = mockMutate;
    mockDraftDiffData.data = undefined;
    mockDraftDiffData.isLoading = false;
  });

  it('renders version input and release notes textarea', () => {
    render(<PublishVersionDialog {...DEFAULT_PROPS} />);

    expect(screen.getByLabelText(/version/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/release notes/i)).toBeInTheDocument();
  });

  it('pre-fills version with suggested next semver bump', () => {
    render(<PublishVersionDialog {...DEFAULT_PROPS} latestVersion="1.0.0" />);

    const input = screen.getByLabelText(/version/i) as HTMLInputElement;
    expect(input.value).toBe('1.1.0');
  });

  it('shows diff counts when diff data has changes', () => {
    mockDraftDiffData.data = makeDiff({ controlsAdded: 3, policiesAdded: 1 });

    render(<PublishVersionDialog {...DEFAULT_PROPS} />);

    expect(screen.getByText('Controls added: 3')).toBeInTheDocument();
    expect(screen.getByText('Policies added: 1')).toBeInTheDocument();
  });

  it('disables Publish button when diff is empty and diff data is loaded', () => {
    mockDraftDiffData.data = makeDiff();

    render(<PublishVersionDialog {...DEFAULT_PROPS} />);

    const publishButton = screen.getByRole('button', { name: /publish version/i });
    expect(publishButton).toBeDisabled();
  });

  it('enables Publish button when diff has changes', () => {
    mockDraftDiffData.data = makeDiff({ controlsAdded: 2 });

    render(<PublishVersionDialog {...DEFAULT_PROPS} />);

    const publishButton = screen.getByRole('button', { name: /publish version/i });
    expect(publishButton).not.toBeDisabled();
  });

  it('calls API with correct body on submit', async () => {
    mockDraftDiffData.data = makeDiff({ controlsAdded: 1 });
    mockPost.mockResolvedValue({ status: 201, data: { data: { id: 'v_new' } }, error: null });
    mockMutate.mockResolvedValue(undefined);

    render(<PublishVersionDialog {...DEFAULT_PROPS} latestVersion="1.0.0" />);

    const publishButton = screen.getByRole('button', { name: /publish version/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/v1/framework-editor/framework/fw_test123/versions',
        expect.objectContaining({ version: '1.1.0' }),
      );
    });
  });

  it('shows collision error on 409 response', async () => {
    mockDraftDiffData.data = makeDiff({ controlsAdded: 1 });
    mockPost.mockResolvedValue({ status: 409, data: null, error: 'Conflict' });

    render(<PublishVersionDialog {...DEFAULT_PROPS} latestVersion="1.0.0" />);

    const publishButton = screen.getByRole('button', { name: /publish version/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText(/1.1.0 is already published/i)).toBeInTheDocument();
    });
  });

  it('does not render dialog when open is false', () => {
    render(<PublishVersionDialog {...DEFAULT_PROPS} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
});
