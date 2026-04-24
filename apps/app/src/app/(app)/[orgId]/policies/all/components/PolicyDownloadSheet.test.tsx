import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Policy } from '@db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { PolicyDownloadSheet } from './PolicyDownloadSheet';

const policies: Array<Pick<Policy, 'id' | 'name' | 'status'>> = [
  { id: 'p1', name: 'Security Policy', status: 'published' },
  { id: 'p2', name: 'Privacy Policy', status: 'needs_review' },
  { id: 'p3', name: 'Draft Policy', status: 'draft' },
];

const renderSheet = (
  overrides: Partial<React.ComponentProps<typeof PolicyDownloadSheet>> = {},
) =>
  render(
    <PolicyDownloadSheet
      open={true}
      onOpenChange={vi.fn()}
      policies={policies}
      {...overrides}
    />,
  );

describe('PolicyDownloadSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one checkbox per policy and all are checked by default', () => {
    renderSheet();

    expect(screen.getByLabelText(/security policy/i)).toBeChecked();
    expect(screen.getByLabelText(/privacy policy/i)).toBeChecked();
    expect(screen.getByLabelText(/draft policy/i)).toBeChecked();
  });

  it('shows a status badge for each policy', () => {
    renderSheet();
    expect(screen.getByText(/published/i)).toBeInTheDocument();
    expect(screen.getByText(/needs review/i)).toBeInTheDocument();
    // "Draft" badge text (distinct from "Draft Policy" name) — use exact match
    expect(screen.getByText(/^draft$/i)).toBeInTheDocument();
  });

  it('shows "Download 3 policies" by default and enables the button', () => {
    renderSheet();
    const btn = screen.getByRole('button', { name: /download 3 policies/i });
    expect(btn).toBeEnabled();
  });

  it('updates the count when a policy is unchecked', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByLabelText(/draft policy/i));

    expect(
      screen.getByRole('button', { name: /download 2 policies/i }),
    ).toBeEnabled();
  });

  it('disables the download button when zero are selected', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByLabelText(/select all/i));

    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
  });

  it('select all toggles every policy', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByLabelText(/select all/i));
    expect(screen.getByLabelText(/security policy/i)).not.toBeChecked();

    await user.click(screen.getByLabelText(/select all/i));
    expect(screen.getByLabelText(/security policy/i)).toBeChecked();
  });

  it('calls the API with selected policyIds and triggers download', async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      data: {
        downloadUrl: 'https://s3/signed.pdf',
        name: 'all-policies',
        policyCount: 2,
      },
      status: 200,
    });

    const onOpenChange = vi.fn();
    renderSheet({ onOpenChange });

    await user.click(screen.getByLabelText(/draft policy/i));
    await user.click(
      screen.getByRole('button', { name: /download 2 policies/i }),
    );

    expect(api.get).toHaveBeenCalledWith(
      '/v1/policies/download-all?policyIds=p1%2Cp2',
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('re-selects all current policies when reopened, dropping stale IDs', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <PolicyDownloadSheet
        open={true}
        onOpenChange={onOpenChange}
        policies={policies}
      />,
    );

    // Deselect one policy while open
    await user.click(screen.getByLabelText(/draft policy/i));
    expect(
      screen.getByRole('button', { name: /download 2 policies/i }),
    ).toBeEnabled();

    // Close and reopen — selection should reset to all
    rerender(
      <PolicyDownloadSheet
        open={false}
        onOpenChange={onOpenChange}
        policies={policies}
      />,
    );
    rerender(
      <PolicyDownloadSheet
        open={true}
        onOpenChange={onOpenChange}
        policies={policies}
      />,
    );

    expect(screen.getByLabelText(/draft policy/i)).toBeChecked();
    expect(
      screen.getByRole('button', { name: /download 3 policies/i }),
    ).toBeEnabled();
  });

  it('updates selection when the policies prop changes while open', () => {
    const { rerender } = render(
      <PolicyDownloadSheet
        open={true}
        onOpenChange={vi.fn()}
        policies={policies}
      />,
    );

    const newPolicies: typeof policies = [
      { id: 'p1', name: 'Security Policy', status: 'published' },
      { id: 'p4', name: 'New Policy', status: 'draft' },
    ];

    rerender(
      <PolicyDownloadSheet
        open={true}
        onOpenChange={vi.fn()}
        policies={newPolicies}
      />,
    );

    // New policy is checked by default; stale IDs are dropped
    expect(screen.getByLabelText(/new policy/i)).toBeChecked();
    expect(screen.queryByLabelText(/privacy policy/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download 2 policies/i }),
    ).toBeEnabled();
  });

  it('shows a toast and keeps the sheet open on API error', async () => {
    const user = userEvent.setup();
    vi.mocked(api.get).mockResolvedValue({
      error: 'boom',
      status: 500,
    });

    const onOpenChange = vi.fn();
    renderSheet({ onOpenChange });

    await user.click(
      screen.getByRole('button', { name: /download 3 policies/i }),
    );

    expect(toast.error).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
