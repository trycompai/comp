import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock @uiw/react-json-view to avoid pulling its bundle into jsdom tests.
// We only need to verify our wrapper renders + the wrapping behavior.
vi.mock('@uiw/react-json-view', () => ({
  default: ({ value }: { value: unknown }) => (
    <pre data-testid="json-view">{JSON.stringify(value)}</pre>
  ),
}));

import { EvidenceJsonViewer } from './EvidenceJsonViewer';

describe('EvidenceJsonViewer', () => {
  it('renders the empty state when evidence is null', () => {
    render(<EvidenceJsonViewer evidence={null} />);
    expect(
      screen.getByText(/No evidence collected for this finding\./i),
    ).toBeInTheDocument();
  });

  it('renders the empty state when evidence is an empty object', () => {
    render(<EvidenceJsonViewer evidence={{}} />);
    expect(
      screen.getByText(/No evidence collected for this finding\./i),
    ).toBeInTheDocument();
  });

  it('renders the JSON view when evidence has content', () => {
    render(
      <EvidenceJsonViewer
        evidence={{ bucketName: 'logs-archive', isPublic: true }}
      />,
    );
    const view = screen.getByTestId('json-view');
    expect(view.textContent).toContain('logs-archive');
    expect(view.textContent).toContain('true');
  });

  it('wraps primitive evidence values under a "value" key', () => {
    render(<EvidenceJsonViewer evidence={'just a string'} />);
    const view = screen.getByTestId('json-view');
    expect(view.textContent).toContain('just a string');
    expect(view.textContent).toContain('value');
  });

  it('renders a Copy button', () => {
    render(<EvidenceJsonViewer evidence={{ a: 1 }} />);
    expect(
      screen.getByRole('button', {
        name: /Copy evidence JSON to clipboard/i,
      }),
    ).toBeInTheDocument();
  });
});
