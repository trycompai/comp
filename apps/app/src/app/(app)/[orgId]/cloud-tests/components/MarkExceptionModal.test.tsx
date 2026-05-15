import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();
vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({ post: postMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stub the dialog wrapper so we don't pull a real portal in jsdom. Render
// children inline when `open`.
vi.mock('@trycompai/ui/dialog', () => {
  const Pass = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return {
    Dialog: ({
      open,
      children,
    }: {
      open: boolean;
      children: React.ReactNode;
    }) => (open ? <div>{children}</div> : null),
    DialogContent: Pass,
    DialogDescription: Pass,
    DialogHeader: Pass,
    DialogTitle: Pass,
  };
});

vi.mock('@trycompai/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

import { MarkExceptionModal } from './MarkExceptionModal';

describe('MarkExceptionModal', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('renders the finding title and resource label', () => {
    render(
      <MarkExceptionModal
        open
        onOpenChange={() => {}}
        findingId="icx_1"
        findingTitle="IAM password policy < 14 characters"
        resourceLabel="IAM Account: 123456789012"
      />,
    );
    expect(
      screen.getByText('IAM password policy < 14 characters'),
    ).toBeInTheDocument();
    expect(screen.getByText('IAM Account: 123456789012')).toBeInTheDocument();
  });

  it('keeps the submit button disabled until reason reaches min length', () => {
    render(
      <MarkExceptionModal
        open
        onOpenChange={() => {}}
        findingId="icx_1"
        findingTitle="X"
      />,
    );
    const submit = screen.getByRole('button', { name: /^Mark as exception$/ });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Reason for exception/i), {
      target: { value: 'too short' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Reason for exception/i), {
      target: {
        value: 'This is a long enough documented reason for the exception.',
      },
    });
    expect(submit).not.toBeDisabled();
  });

  it('submits to the exception endpoint and invokes onMarked on success', async () => {
    postMock.mockResolvedValueOnce({ error: null, data: { data: { id: 'fex_1' } } });
    const onMarked = vi.fn();
    render(
      <MarkExceptionModal
        open
        onOpenChange={() => {}}
        findingId="icx_1"
        findingTitle="X"
        onMarked={onMarked}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Reason for exception/i), {
      target: {
        value: 'This is a long enough documented reason for the exception.',
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /^Mark as exception$/ }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(postMock).toHaveBeenCalledWith(
      '/v1/cloud-security/findings/icx_1/exception',
      expect.objectContaining({
        reason: 'This is a long enough documented reason for the exception.',
      }),
    );
    expect(onMarked).toHaveBeenCalled();
  });

  it('does not invoke onMarked when the API responds with an error', async () => {
    postMock.mockResolvedValueOnce({ error: 'Forbidden' });
    const onMarked = vi.fn();
    render(
      <MarkExceptionModal
        open
        onOpenChange={() => {}}
        findingId="icx_1"
        findingTitle="X"
        onMarked={onMarked}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Reason for exception/i), {
      target: {
        value: 'This is a long enough documented reason for the exception.',
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /^Mark as exception$/ }),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onMarked).not.toHaveBeenCalled();
  });
});
