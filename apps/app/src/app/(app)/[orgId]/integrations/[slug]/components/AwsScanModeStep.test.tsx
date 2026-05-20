import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AwsScanModeStep,
  DEFAULT_AWS_SCAN_MODE_CHOICE,
} from './AwsScanModeStep';

describe('AwsScanModeStep', () => {
  it('renders both scan engine options', () => {
    render(
      <AwsScanModeStep value={DEFAULT_AWS_SCAN_MODE_CHOICE} onChange={() => {}} />,
    );
    expect(screen.getByText('Comp AI Scanners')).toBeInTheDocument();
    expect(screen.getByText('AWS Security Hub')).toBeInTheDocument();
  });

  it('marks the value prop as selected (controlled component)', () => {
    const { rerender } = render(
      <AwsScanModeStep value="comp_scanners" onChange={() => {}} />,
    );

    const compRadio = screen.getByRole('radio', { name: /comp ai scanners/i });
    const sechubRadio = screen.getByRole('radio', { name: /aws security hub/i });
    expect(compRadio).toBeChecked();
    expect(sechubRadio).not.toBeChecked();

    rerender(<AwsScanModeStep value="security_hub" onChange={() => {}} />);
    expect(compRadio).not.toBeChecked();
    expect(sechubRadio).toBeChecked();
  });

  it('calls onChange with the new mode when the customer picks the other option', () => {
    const onChange = vi.fn();
    render(<AwsScanModeStep value="comp_scanners" onChange={onChange} />);

    fireEvent.click(
      screen.getByRole('radio', { name: /aws security hub/i }),
    );
    expect(onChange).toHaveBeenCalledWith('security_hub');
  });

  it('does not call onChange when re-selecting the same option', () => {
    // Defensive — re-clicking the selected radio fires onChange with the
    // same value (browser semantics), which is fine but worth noting.
    const onChange = vi.fn();
    render(<AwsScanModeStep value="comp_scanners" onChange={onChange} />);

    // Click on the already-selected one — radio onChange does NOT fire
    // when re-selecting the checked option, so onChange stays at 0.
    fireEvent.click(
      screen.getByRole('radio', { name: /comp ai scanners/i }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables all radios when the disabled prop is true', () => {
    render(
      <AwsScanModeStep
        value="comp_scanners"
        onChange={() => {}}
        disabled
      />,
    );
    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => expect(radio).toBeDisabled());
  });

  it('exposes a single source of truth for the default mode', () => {
    // Guarded with a test so changing the default is intentional —
    // shifting it would silently flip every new connection's scan
    // engine choice.
    expect(DEFAULT_AWS_SCAN_MODE_CHOICE).toBe('comp_scanners');
  });
});
