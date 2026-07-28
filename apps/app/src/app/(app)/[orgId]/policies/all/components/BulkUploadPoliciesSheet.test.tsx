import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// `useApi` reaches for `useParams` (not in the global next/navigation mock) and
// the SWR stack — mock it down to just the `post` the sheet uses.
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({ post }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// react-dropzone does real file-type/hit-testing that jsdom can't drive; stub it
// down to an <input type="file"> whose change fires the real `onDrop`.
vi.mock('react-dropzone', () => ({
  default: ({
    children,
    onDrop,
    disabled,
  }: {
    children: (args: {
      getRootProps: () => Record<string, unknown>;
      getInputProps: () => Record<string, unknown>;
      isDragActive: boolean;
    }) => React.ReactNode;
    onDrop: (files: File[]) => void;
    disabled?: boolean;
  }) =>
    children({
      getRootProps: () => ({}),
      getInputProps: () => ({
        type: 'file',
        'data-testid': 'dropzone-input',
        disabled,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onDrop(Array.from(e.target.files ?? [])),
      }),
      isDragActive: false,
    }),
}));

import { BulkUploadPoliciesSheet } from './BulkUploadPoliciesSheet';

/** A real PDF File so name/size/type behave like the browser. */
function pdf(name: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: 'application/pdf',
  });
}

describe('BulkUploadPoliciesSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reuses the draft from a failed attach on retry instead of creating a duplicate', async () => {
    const user = userEvent.setup();
    post
      .mockResolvedValueOnce({ data: { id: 'pol_A' }, status: 201 }) // create
      .mockResolvedValueOnce({ error: 'attach boom', status: 400 }) // attach fails
      .mockResolvedValueOnce({ data: { success: true }, status: 200 }); // retry attach

    const onOpenChange = vi.fn();
    render(<BulkUploadPoliciesSheet open onOpenChange={onOpenChange} />);

    await user.upload(screen.getByTestId('dropzone-input'), pdf('Access.pdf'));

    // First attempt: create succeeds, attach fails → row kept with its error.
    await user.click(screen.getByRole('button', { name: /upload 1 policy/i }));
    expect(await screen.findByText('attach boom')).toBeInTheDocument();

    // Retry the same failed file.
    await user.click(screen.getByRole('button', { name: /upload 1 policy/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

    const createCalls = post.mock.calls.filter(([url]) => url === '/v1/policies');
    const attachCalls = post.mock.calls.filter(
      ([url]) => url === '/v1/policies/pol_A/pdf',
    );
    // The draft is created once and re-attached — no orphan/duplicate draft.
    expect(createCalls).toHaveLength(1);
    expect(attachCalls).toHaveLength(2);
  });

  it('cannot be closed mid-upload, preserving failed-file retry state', async () => {
    const user = userEvent.setup();
    let resolveCreate!: (value: { error: string; status: number }) => void;
    // The create request hangs, so the upload stays in flight.
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const onOpenChange = vi.fn();
    render(<BulkUploadPoliciesSheet open onOpenChange={onOpenChange} />);

    await user.upload(screen.getByTestId('dropzone-input'), pdf('Data.pdf'));
    expect(screen.getByText('Data.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /upload 1 policy/i }));

    // Try to close via the sheet's X while the request is still running.
    await user.click(screen.getByRole('button', { name: /close/i }));

    // Sheet stays open, the file (retry state) is intact, parent not closed.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByText('Data.pdf')).toBeInTheDocument();

    // Let the in-flight request settle so the component unwinds cleanly.
    resolveCreate({ error: 'create failed', status: 400 });
    expect(await screen.findByText('create failed')).toBeInTheDocument();
  });
});
