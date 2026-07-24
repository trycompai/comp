import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Spinner: () => <span data-testid="spinner" />,
}));
vi.mock('@trycompai/design-system/icons', () => ({
  Play: () => <span />,
  Renew: () => <span />,
  Screen: () => <span />,
}));
vi.mock('./LiveActivityBorder', () => ({ LiveActivityBorder: () => <span data-testid="border" /> }));
vi.mock('./StepList', () => ({ StepList: () => <div data-testid="step-list" /> }));

import { BrowserLiveView } from './BrowserLiveView';

const baseProps = {
  title: 'Running: Access evidence',
  subtitle: 'Watching the AI…',
  liveViewUrl: 'https://live.example/session',
  onCancel: vi.fn(),
};

describe('BrowserLiveView transition overlay', () => {
  it('covers the iframe while switching between vendors', () => {
    render(<BrowserLiveView {...baseProps} variant="execution" livePhase="switching" />);
    expect(screen.getByText('Switching to the next vendor…')).toBeInTheDocument();
    // The overlay carries a spinner (the header shows one too, hence getAll).
    expect(screen.getAllByTestId('spinner').length).toBeGreaterThan(0);
  });

  it('covers the iframe while the run is finishing', () => {
    render(<BrowserLiveView {...baseProps} variant="execution" livePhase="finishing" />);
    expect(screen.getByText('Saving evidence…')).toBeInTheDocument();
  });

  it('shows no overlay while a session is live (running)', () => {
    render(<BrowserLiveView {...baseProps} variant="execution" livePhase="running" />);
    expect(screen.queryByText('Switching to the next vendor…')).not.toBeInTheDocument();
    expect(screen.queryByText('Saving evidence…')).not.toBeInTheDocument();
  });

  it('never shows the overlay for the auth variant', () => {
    // livePhase is execution-only; auth (reconnect) must never be covered.
    render(<BrowserLiveView {...baseProps} variant="auth" livePhase="switching" />);
    expect(screen.queryByText('Switching to the next vendor…')).not.toBeInTheDocument();
  });
});
