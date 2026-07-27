import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ismsDesignSystemMock } from '../__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());

import { IsmsSourceBadge } from './IsmsSourceBadge';

describe('IsmsSourceBadge', () => {
  it('shows the party name for a party-derived row, never the raw record id', () => {
    render(<IsmsSourceBadge source="derived" derivedFrom="party:Employees / workforce" />);

    expect(screen.getByText('Employees / workforce')).toBeInTheDocument();
    // The raw "party:" provenance prefix must never leak into the label.
    expect(screen.queryByText(/^party:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Party /)).not.toBeInTheDocument();
  });

  it('falls back to "Interested party" when the party name is blank', () => {
    render(<IsmsSourceBadge source="derived" derivedFrom="party:" />);

    expect(screen.getByText('Interested party')).toBeInTheDocument();
  });

  it('shows the framework name for framework provenance', () => {
    render(<IsmsSourceBadge source="derived" derivedFrom="framework:ISO 27001" />);

    expect(screen.getByText('ISO 27001')).toBeInTheDocument();
  });

  it('maps known provenance keys to friendly labels', () => {
    render(<IsmsSourceBadge source="derived" derivedFrom="vendors" />);

    expect(screen.getByText('Vendor register')).toBeInTheDocument();
  });

  it('labels manual rows "Manual"', () => {
    render(<IsmsSourceBadge source="manual" derivedFrom={null} />);

    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});
