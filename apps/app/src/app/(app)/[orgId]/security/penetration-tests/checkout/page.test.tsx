import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from 'next/navigation';

import VulnerabilityReportCheckoutPage, { generateMetadata } from './page';

const authGetSessionMock = vi.fn();
const dbFindFirstMock = vi.fn();
const headersMock = vi.fn();

vi.mock('@/utils/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => authGetSessionMock(...args),
    },
  },
}));

vi.mock('@db', () => ({
  db: {
    member: {
      findFirst: (...args: unknown[]) => dbFindFirstMock(...args),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: () => headersMock(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Penetration test checkout page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockReturnValue(new Headers());
    authGetSessionMock.mockResolvedValue({ user: { id: 'user_1' } });
    dbFindFirstMock.mockResolvedValue({ id: 'member_1' });
    vi.mocked(redirect).mockImplementation(() => {
      const error = new Error('NEXT_REDIRECT');
      (error as Error & { digest: string }).digest = 'NEXT_REDIRECT';
      throw error;
    });
  });

  it('renders checkout call-to-action when session and membership are valid', async () => {
    const page = await VulnerabilityReportCheckoutPage({
      params: Promise.resolve({ orgId: 'org_1' }),
      searchParams: Promise.resolve({ runId: 'run_1' }),
    });

    render(page);

    expect(screen.getByRole('heading', { name: /Mock Checkout/i })).toBeInTheDocument();
    const purchaseButton = screen.getByRole('button', { name: /Complete Purchase/i });
    const purchaseForm = purchaseButton.closest('form');

    expect(purchaseButton).toBeInTheDocument();
    expect(purchaseForm).toHaveAttribute(
      'action',
      '/org_1/security/penetration-tests?checkout=success&runId=run_1',
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects when user is unauthenticated', async () => {
    authGetSessionMock.mockResolvedValue(null);

    await expect(
      VulnerabilityReportCheckoutPage({
        params: Promise.resolve({ orgId: 'org_1' }),
        searchParams: Promise.resolve({ runId: 'run_1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/auth');
  });

  it('redirects when member cannot be found', async () => {
    dbFindFirstMock.mockResolvedValue(null);

    await expect(
      VulnerabilityReportCheckoutPage({
        params: Promise.resolve({ orgId: 'org_1' }),
        searchParams: Promise.resolve({ runId: 'run_1' }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('redirects back to report list when runId is missing', async () => {
    await expect(
      VulnerabilityReportCheckoutPage({
        params: Promise.resolve({ orgId: 'org_1' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/org_1/security/penetration-tests');
  });

  it('returns the correct metadata title', async () => {
    const metadata = await generateMetadata();

    expect(metadata).toEqual({ title: 'Mock Penetration Test Checkout' });
  });
});
