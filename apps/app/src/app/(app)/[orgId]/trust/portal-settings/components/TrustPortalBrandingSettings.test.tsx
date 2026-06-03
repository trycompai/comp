import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrustPortalBrandingSettings } from './TrustPortalBrandingSettings';

interface MockFaviconProps {
  currentFaviconUrl: string | null;
  onFaviconChange?: (faviconUrl: string | null) => void;
}

interface MockBrandProps {
  primaryColor: string | null;
  onPrimaryColorChange?: (primaryColor: string | null) => void;
}

vi.mock('./UpdateTrustFavicon', () => ({
  UpdateTrustFavicon: ({ currentFaviconUrl, onFaviconChange }: MockFaviconProps) => (
    <div>
      <div data-testid="favicon-url">{currentFaviconUrl ?? 'default'}</div>
      <button type="button" onClick={() => onFaviconChange?.('https://example.com/favicon.png')}>
        Set favicon
      </button>
    </div>
  ),
}));

vi.mock('./BrandSettings', () => ({
  BrandSettings: ({ primaryColor, onPrimaryColorChange }: MockBrandProps) => (
    <div>
      <div data-testid="primary-color">{primaryColor ?? 'default'}</div>
      <button type="button" onClick={() => onPrimaryColorChange?.('#00FF00')}>
        Set color
      </button>
    </div>
  ),
}));

describe('TrustPortalBrandingSettings', () => {
  it('keeps saved branding values available for remounted tab content', () => {
    render(<TrustPortalBrandingSettings enabled={true} primaryColor={null} faviconUrl={null} />);

    expect(screen.getByTestId('favicon-url')).toHaveTextContent('default');
    expect(screen.getByTestId('primary-color')).toHaveTextContent('default');

    fireEvent.click(screen.getByRole('button', { name: /set favicon/i }));
    fireEvent.click(screen.getByRole('button', { name: /set color/i }));

    expect(screen.getByTestId('favicon-url')).toHaveTextContent('https://example.com/favicon.png');
    expect(screen.getByTestId('primary-color')).toHaveTextContent('#00FF00');
  });
});
