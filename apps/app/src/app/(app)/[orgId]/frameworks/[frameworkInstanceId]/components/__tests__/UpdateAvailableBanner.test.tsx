import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdateAvailableBanner } from '../UpdateAvailableBanner';
import type { FrameworkUpdateStatus } from '@/types/framework-versioning';

const statusWithUpdate: FrameworkUpdateStatus = {
  updateAvailable: true,
  currentVersion: { id: 'v1', version: '1.0.0' },
  latestVersion: {
    id: 'v2',
    version: '2.0.0',
    publishedAt: '2024-01-01T00:00:00Z',
    releaseNotes: 'New controls added.',
  },
};

const statusNoUpdate: FrameworkUpdateStatus = {
  updateAvailable: false,
  currentVersion: { id: 'v1', version: '1.0.0' },
  latestVersion: {
    id: 'v1',
    version: '1.0.0',
    publishedAt: '2024-01-01T00:00:00Z',
    releaseNotes: null,
  },
};

describe('UpdateAvailableBanner', () => {
  it('returns null when updateAvailable is false', () => {
    const { container } = render(
      <UpdateAvailableBanner
        status={statusNoUpdate}
        canUpdate={true}
        onReview={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders when updateAvailable is true', () => {
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={true}
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByText(/Update available/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.0\.0.*2\.0\.0/i)).toBeInTheDocument();
  });

  it('renders Review update button when canUpdate is true', () => {
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={true}
        onReview={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /review update/i }),
    ).toBeInTheDocument();
  });

  it('hides Review update button when canUpdate is false', () => {
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={false}
        onReview={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /review update/i }),
    ).not.toBeInTheDocument();
  });

  it('fires onReview when Review update button is clicked', () => {
    const onReview = vi.fn();
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={true}
        onReview={onReview}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /review update/i }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it('shows release notes when present', () => {
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={true}
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByText('New controls added.')).toBeInTheDocument();
  });

  it('shows active audit warning when hasActiveAudit is true', () => {
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={true}
        onReview={vi.fn()}
        hasActiveAudit={true}
      />,
    );
    expect(screen.getByText(/Active audit in progress/i)).toBeInTheDocument();
  });

  it('does not show active audit warning when hasActiveAudit is false', () => {
    render(
      <UpdateAvailableBanner
        status={statusWithUpdate}
        canUpdate={true}
        onReview={vi.fn()}
        hasActiveAudit={false}
      />,
    );
    expect(
      screen.queryByText(/Active audit in progress/i),
    ).not.toBeInTheDocument();
  });
});
