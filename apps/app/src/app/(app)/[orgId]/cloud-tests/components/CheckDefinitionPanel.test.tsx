import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type SwrShape = {
  data: { data: unknown } | undefined;
  error: unknown;
  isLoading: boolean;
};

const mockUseSWR = vi.fn<() => SwrShape>();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    useSWR: (_url: string) => mockUseSWR(),
  }),
}));

import { CheckDefinitionPanel } from './CheckDefinitionPanel';

describe('CheckDefinitionPanel', () => {
  beforeEach(() => {
    mockUseSWR.mockReset();
  });

  it('renders a loading skeleton while the fetch is in flight', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });
    render(<CheckDefinitionPanel findingId="icx_abc" />);
    expect(
      screen.getByText(/Generating check description/i),
    ).toBeInTheDocument();
  });

  it('renders all Tier 3 fields when the AI/provider responds successfully', () => {
    mockUseSWR.mockReturnValue({
      data: {
        data: {
          data: {
            title: 'IAM password policy enforces 14+ character minimum',
            description:
              'Verifies that the AWS account password policy requires user passwords to be at least 14 characters long.',
            passCriteria:
              'Password policy exists AND MinimumPasswordLength >= 14',
            failCriteria:
              'No password policy OR MinimumPasswordLength < 14',
            whyItMatters:
              'Short passwords are vulnerable to brute force attacks.',
            source: 'ai',
          },
        },
      },
      error: null,
      isLoading: false,
    });
    render(<CheckDefinitionPanel findingId="icx_abc" />);
    expect(screen.getByText('About this check')).toBeInTheDocument();
    expect(screen.getByText('What it checks')).toBeInTheDocument();
    expect(screen.getByText('Pass criteria')).toBeInTheDocument();
    expect(screen.getByText('Fail criteria')).toBeInTheDocument();
    expect(screen.getByText('Why it matters')).toBeInTheDocument();
    expect(
      screen.getByText(/at least 14 characters long/i),
    ).toBeInTheDocument();
  });

  it('renders nothing when fetch errors (graceful degrade)', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: new Error('500'),
      isLoading: false,
    });
    const { container } = render(<CheckDefinitionPanel findingId="icx_abc" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when AI returned null (e.g. legacy with no description)', () => {
    mockUseSWR.mockReturnValue({
      data: { data: { data: null } },
      error: null,
      isLoading: false,
    });
    const { container } = render(<CheckDefinitionPanel findingId="icx_abc" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows a "From provider catalog" badge for GCP/Azure-sourced descriptions', () => {
    mockUseSWR.mockReturnValue({
      data: {
        data: {
          data: {
            title: 'Cloud Storage bucket is publicly accessible',
            description: 'Surfaced from Google Security Command Center.',
            passCriteria: 'No public ACLs detected.',
            failCriteria: 'Bucket has public ACL grants.',
            whyItMatters: 'Public buckets risk data exposure.',
            source: 'provider',
          },
        },
      },
      error: null,
      isLoading: false,
    });
    render(<CheckDefinitionPanel findingId="icx_abc" />);
    expect(screen.getByText('About this check')).toBeInTheDocument();
    expect(screen.getByText(/From provider catalog/i)).toBeInTheDocument();
  });
});
