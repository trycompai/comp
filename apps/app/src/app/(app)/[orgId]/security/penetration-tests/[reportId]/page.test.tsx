import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from 'next/navigation';

import PenetrationTestPage, { generateMetadata } from './page';

const authGetSessionMock = vi.fn();
const dbFindFirstMock = vi.fn();
const headersMock = vi.fn();
const childMock = vi.fn();

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

vi.mock('./penetration-test-page-client', () => ({
  PenetrationTestPageClient: ({ orgId, reportId }: { orgId: string; reportId: string }) => {
    childMock({ orgId, reportId });
    return (
      <div data-testid="penetration-test-page-client">
        {orgId}:{reportId}
      </div>
    );
  },
}));

describe('Penetration Test detail page', () => {
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

  it('renders the detail client component for authorized members', async () => {
    const page = await PenetrationTestPage({
      params: Promise.resolve({ orgId: 'org_1', reportId: 'run_1' }),
    });

    render(page);

    expect(screen.getByTestId('penetration-test-page-client')).toHaveTextContent('org_1:run_1');
    expect(childMock).toHaveBeenCalledWith({ orgId: 'org_1', reportId: 'run_1' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects when user is unauthenticated', async () => {
    authGetSessionMock.mockResolvedValue(null);

    await expect(
      PenetrationTestPage({ params: Promise.resolve({ orgId: 'org_1', reportId: 'run_1' }) }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/auth');
    expect(childMock).not.toHaveBeenCalled();
  });

  it('redirects when member cannot be found', async () => {
    dbFindFirstMock.mockResolvedValue(null);

    await expect(
      PenetrationTestPage({ params: Promise.resolve({ orgId: 'org_1', reportId: 'run_1' }) }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(redirect).toHaveBeenCalledWith('/');
    expect(childMock).not.toHaveBeenCalled();
  });

  it('returns the correct metadata title', async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ orgId: 'org_1', reportId: 'run_1' }) });

    expect(metadata).toEqual({ title: 'Penetration Test run_1' });
  });
});
