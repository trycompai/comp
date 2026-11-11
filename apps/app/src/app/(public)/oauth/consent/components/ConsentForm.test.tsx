import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: { post: (...args: unknown[]) => mockPost(...args) },
}));

import { ConsentForm } from './ConsentForm';

const CONSENT = {
  clientName: 'Client App',
  redirectUri: 'https://client.example.com/callback',
};

describe('ConsentForm', () => {
  const originalLocation = window.location;
  const mockAssign = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: mockAssign },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows the app name and where access will be sent', () => {
    render(<ConsentForm consentCode="code_1" consent={CONSENT} />);

    expect(
      screen.getByRole('heading', { name: 'Allow Client App to access your account?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('client.example.com')).toBeInTheDocument();
    expect(screen.getByText(CONSENT.redirectUri)).toBeInTheDocument();
  });

  it.each([
    ['Allow', true],
    ['Deny', false],
  ])('submits %s and follows the returned redirect', async (label, accept) => {
    const redirectURI = `${CONSENT.redirectUri}?code=abc&state=xyz`;
    mockPost.mockResolvedValue({ data: { redirectURI }, status: 200 });
    render(<ConsentForm consentCode="code_1" consent={CONSENT} />);

    fireEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => expect(mockAssign).toHaveBeenCalledWith(redirectURI));
    expect(mockPost).toHaveBeenCalledWith('/api/auth/oauth2/consent', {
      accept,
      consent_code: 'code_1',
    });
  });

  it.each([
    ['the request fails', { error: 'HTTP 401', status: 401 }],
    [
      'the redirect is not a supported URL',
      { data: { redirectURI: 'data:text/plain,x' }, status: 200 },
    ],
  ])('shows an error and stays on the page when %s', async (_label, response) => {
    mockPost.mockResolvedValue(response);
    render(<ConsentForm consentCode="code_1" consent={CONSENT} />);

    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));

    expect(await screen.findByText(/could not be completed/)).toBeInTheDocument();
    expect(mockAssign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Allow' })).not.toBeDisabled();
  });
});
