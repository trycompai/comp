import { Impact, Likelihood } from '@db';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RiskMatrixChart } from './RiskMatrixChart';

describe('RiskMatrixChart', () => {
  it('renders the legend', () => {
    render(
      <RiskMatrixChart
        title="Residual Risk"
        description="x"
        riskId="rsk_1"
        activeLikelihood={Likelihood.possible}
        activeImpact={Impact.moderate}
        saveAction={vi.fn()}
      />,
    );
    expect(screen.getByText('Very Low')).toBeInTheDocument();
    expect(screen.getByText('Very High')).toBeInTheDocument();
  });

  it('renders the Accept-suggested button only when a suggestion differs from active', () => {
    const saveAction = vi.fn();
    const { rerender } = render(
      <RiskMatrixChart
        title="Residual Risk"
        description="x"
        riskId="rsk_1"
        activeLikelihood={Likelihood.likely}
        activeImpact={Impact.major}
        suggestedLikelihood={Likelihood.possible}
        suggestedImpact={Impact.moderate}
        saveAction={saveAction}
      />,
    );
    expect(screen.getByRole('button', { name: /Accept suggested residual/i })).toBeInTheDocument();

    rerender(
      <RiskMatrixChart
        title="Residual Risk"
        description="x"
        riskId="rsk_1"
        activeLikelihood={Likelihood.possible}
        activeImpact={Impact.moderate}
        suggestedLikelihood={Likelihood.possible}
        suggestedImpact={Impact.moderate}
        saveAction={saveAction}
      />,
    );
    expect(screen.queryByRole('button', { name: /Accept suggested residual/i })).toBeNull();
  });

  it('Accept-suggested snaps the active cell to the suggested coords', () => {
    const saveAction = vi.fn();
    render(
      <RiskMatrixChart
        title="Residual Risk"
        description="x"
        riskId="rsk_1"
        activeLikelihood={Likelihood.likely}
        activeImpact={Impact.major}
        suggestedLikelihood={Likelihood.possible}
        suggestedImpact={Impact.moderate}
        saveAction={saveAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Accept suggested residual/i }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders no ghost marker when suggestion matches active cell', () => {
    render(
      <RiskMatrixChart
        title="Residual Risk"
        description="x"
        riskId="rsk_1"
        activeLikelihood={Likelihood.possible}
        activeImpact={Impact.moderate}
        suggestedLikelihood={Likelihood.possible}
        suggestedImpact={Impact.moderate}
        saveAction={vi.fn()}
      />,
    );
    expect(document.querySelectorAll('.border-dashed').length).toBe(0);
  });
});
