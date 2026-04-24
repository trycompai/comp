import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreatmentPlanTab, type TreatmentPlanEntity } from './TreatmentPlanTab';

const baseEntity: TreatmentPlanEntity = {
  id: 'rsk_1',
  inherentLikelihood: Likelihood.likely,
  inherentImpact: Impact.major,
  residualLikelihood: Likelihood.likely,
  residualImpact: Impact.major,
  treatmentStrategy: RiskTreatmentType.accept,
  treatmentStrategyDescription: null,
  tasks: [],
};

type Props = Parameters<typeof TreatmentPlanTab>[0];

function buildProps(overrides?: Partial<Props>): Props {
  return {
    orgId: 'org_1',
    entity: baseEntity,
    canUpdate: true,
    onUpdateStrategy: vi.fn().mockResolvedValue(undefined),
    onUpdateDescription: vi.fn().mockResolvedValue(undefined),
    onRegenerate: vi.fn().mockResolvedValue(undefined),
    regenerating: false,
    ...overrides,
  };
}

describe('TreatmentPlanTab', () => {
  it('renders strategy, description editor, linked-work, and delta chip', () => {
    render(<TreatmentPlanTab {...buildProps()} />);
    expect(screen.getByText('Strategy')).toBeInTheDocument();
    expect(screen.getByText('Treatment plan')).toBeInTheDocument();
    expect(screen.getByText('Linked work')).toBeInTheDocument();
    expect(screen.getByText(/from treatment plan|no change/)).toBeInTheDocument();
  });

  it('calls onUpdateStrategy when strategy changes', async () => {
    const onUpdateStrategy = vi.fn().mockResolvedValue(undefined);
    render(<TreatmentPlanTab {...buildProps({ onUpdateStrategy })} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mitigate' }));
    await waitFor(() => {
      expect(onUpdateStrategy).toHaveBeenCalledWith(RiskTreatmentType.mitigate);
    });
  });

  it('disables inputs when canUpdate is false', () => {
    render(<TreatmentPlanTab {...buildProps({ canUpdate: false })} />);
    expect(screen.getByRole('radio', { name: 'Mitigate' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });

  it('changes Regenerate label based on description presence', () => {
    const { rerender } = render(<TreatmentPlanTab {...buildProps()} />);
    expect(
      screen.getByRole('button', { name: /Generate treatment plan/i }),
    ).toBeInTheDocument();

    rerender(
      <TreatmentPlanTab
        {...buildProps({
          entity: { ...baseEntity, treatmentStrategyDescription: 'We isolated this vendor.' },
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /Regenerate with AI/i })).toBeInTheDocument();
  });

  it('shows suggested residual in the Linked work description based on strategy + completion', () => {
    const entity: TreatmentPlanEntity = {
      ...baseEntity,
      treatmentStrategy: RiskTreatmentType.mitigate,
      tasks: [
        { id: 't1', title: 'Task 1', status: TaskStatus.done, controls: [] },
        { id: 't2', title: 'Task 2', status: TaskStatus.done, controls: [] },
      ],
    };
    render(<TreatmentPlanTab {...buildProps({ entity })} />);
    expect(screen.getByText(/100% complete/i)).toBeInTheDocument();
  });
});
