import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@trycompai/design-system', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertTitle: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

import { TrustPortalGettingStarted } from './TrustPortalGettingStarted';

describe('TrustPortalGettingStarted', () => {
  it('renders the live shared portal URL', () => {
    render(<TrustPortalGettingStarted portalUrl="https://trust.inc/org_123" />);
    expect(screen.getByText(/trust.inc\/org_123/)).toBeInTheDocument();
  });

  it('renders the getting-started heading', () => {
    render(<TrustPortalGettingStarted portalUrl="https://trust.inc/org_123" />);
    expect(
      screen.getByText(/finish setting up your trust portal/i),
    ).toBeInTheDocument();
  });

  it('renders the setup steps', () => {
    render(<TrustPortalGettingStarted portalUrl="https://trust.inc/org_123" />);
    expect(screen.getByText(/frameworks you/i)).toBeInTheDocument();
    expect(screen.getByText(/published policies show automatically/i)).toBeInTheDocument();
  });
});
