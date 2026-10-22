import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('@/lib/api-server', () => ({
  serverApi: { get: (...args: unknown[]) => mockGet(...args) },
}));

vi.mock('./components/ConsentForm', () => ({
  ConsentForm: ({
    consentCode,
    consent,
  }: {
    consentCode: string;
    consent: { clientName: string };
  }) => <div>{`form:${consentCode}:${consent.clientName}`}</div>,
}));

import OAuthConsentPage from './page';

const renderPage = async (searchParams: Record<string, string | string[]>) =>
  render(await OAuthConsentPage({ searchParams: Promise.resolve(searchParams) }));

describe('OAuthConsentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the pending authorization by its consent code', async () => {
    mockGet.mockResolvedValue({
      data: { clientName: 'Client App', redirectUri: 'https://client.example.com/cb' },
      status: 200,
    });

    await renderPage({ consent_code: 'code 1', client_id: 'other' });

    expect(mockGet).toHaveBeenCalledWith('/v1/auth/oauth-consent?consent_code=code%201');
    expect(screen.getByText('form:code 1:Client App')).toBeInTheDocument();
  });

  it('shows a generic message when the API does not return the authorization', async () => {
    mockGet.mockResolvedValue({ error: 'Not Found', status: 404 });

    await renderPage({ consent_code: 'code_1' });

    expect(screen.getByText('This request is no longer valid')).toBeInTheDocument();
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
  });

  it.each([[{}], [{ consent_code: ['a', 'b'] }]])(
    'does not call the API without a single consent code (%p)',
    async (searchParams) => {
      await renderPage(searchParams);

      expect(mockGet).not.toHaveBeenCalled();
      expect(screen.getByText('This request is no longer valid')).toBeInTheDocument();
    },
  );
});
