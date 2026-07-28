import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock('@trycompai/design-system/icons', () => ({
  Renew: () => <span />,
  TrashCan: () => <span />,
}));
vi.mock('@/components/VendorLogo', () => ({
  VendorLogo: () => <span data-testid="vendor-logo" />,
}));

import { ResumeConnectStrip } from './ResumeConnectStrip';

describe('ResumeConnectStrip', () => {
  it('names the vendor and offers resume + discard', () => {
    const onResume = vi.fn();
    const onDiscard = vi.fn();
    render(
      <ResumeConnectStrip host="github.com" onResume={onResume} onDiscard={onDiscard} />,
    );

    expect(screen.getByText(/Finish connecting to github\.com/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Resume'));
    expect(onResume).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText(/discard in-progress connection/i));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
