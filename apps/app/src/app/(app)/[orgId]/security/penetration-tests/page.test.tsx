import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from 'next/navigation';

import PenetrationTestsPage, { generateMetadata } from './page';

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

vi.mock('./penetration-tests-page-client', () => ({
  PenetrationTestsPageClient: ({ orgId }: { orgId: string }) => {
    childMock(orgId);
    return <div data-testid="penetration-tests-page-client">{orgId}</div>;
  },
}));

describe('Penetration Tests page', () => {
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

  it('renders the client page for authorized members', async () => {
    const page = await PenetrationTestsPage({ params: Promise.resolve({ orgId: 'org_1' }) });

    render(page);

    expect(screen.getByTestId('penetration-tests-page-client')).toHaveTextContent('org_1');
    expect(childMock).toHaveBeenCalledWith('org_1');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects when user is unauthenticated', async () => {
    authGetSessionMock.mockResolvedValue(null);

    await expect(PenetrationTestsPage({ params: Promise.resolve({ orgId: 'org_1' }) })).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(redirect).toHaveBeenCalledWith('/auth');
    expect(dbFindFirstMock).not.toHaveBeenCalled();
    expect(childMock).not.toHaveBeenCalled();
  });

  it('redirects when member cannot be found', async () => {
    dbFindFirstMock.mockResolvedValue(null);

    await expect(PenetrationTestsPage({ params: Promise.resolve({ orgId: 'org_1' }) })).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(authGetSessionMock).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    expect(redirect).toHaveBeenCalledWith('/');
    expect(childMock).not.toHaveBeenCalled();
  });

  it('returns the correct metadata title', async () => {
    const metadata = await generateMetadata();

    expect(metadata).toEqual({
      title: 'Penetration Tests',
    });
  });
});
