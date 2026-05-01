import { Impact, Likelihood, RiskTreatmentType, TaskStatus } from '@db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TreatmentPlanTab, type TreatmentPlanEntity } from './TreatmentPlanTab';

const baseEntity: TreatmentPlanEntity = {
  id: 'rsk_1',
  inherentLikelihood: Likelihood.likely,
  inherentImpact: Impact.major,
  residualLikelihood: Likelihood.unlikely,
  residualImpact: Impact.minor,
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
  it('renders the three workspace columns', () => {
    render(<TreatmentPlanTab {...buildProps()} />);
    expect(screen.getByText('Strategy')).toBeInTheDocument();
    expect(screen.getByText('Treatment plan')).toBeInTheDocument();
    expect(screen.getByText('Linked work')).toBeInTheDocument();
  });

  it('renders the hero numerals for inherent and residual scores', () => {
    // likely × major = 4 × 4 = 16 raw → score = ceil(16/2.5) = 7
    // unlikely × minor = 2 × 2 = 4 raw → score = ceil(4/2.5) = 2
    render(<TreatmentPlanTab {...buildProps()} />);
    const headline = screen.getByLabelText(/From 7 to 2 out of 10/i);
    expect(headline).toBeInTheDocument();
    expect(headline.textContent).toContain('7');
    expect(headline.textContent).toContain('2');
  });

  it('calls onUpdateStrategy when strategy card is clicked', async () => {
    const onUpdateStrategy = vi.fn().mockResolvedValue(undefined);
    render(<TreatmentPlanTab {...buildProps({ onUpdateStrategy })} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Mitigate' }));
    await waitFor(() => {
      expect(onUpdateStrategy).toHaveBeenCalledWith(RiskTreatmentType.mitigate);
    });
  });

  it('disables strategy buttons and Save when canUpdate is false', () => {
    render(<TreatmentPlanTab {...buildProps({ canUpdate: false })} />);
    expect(screen.getByRole('radio', { name: 'Mitigate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeDisabled();
  });

  it('switches the regenerate label based on description presence', () => {
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

  it('shows task completion percent in the hero stats', () => {
    const entity: TreatmentPlanEntity = {
      ...baseEntity,
      treatmentStrategy: RiskTreatmentType.mitigate,
      tasks: [
        { id: 't1', title: 'Task 1', status: TaskStatus.done, controls: [] },
        { id: 't2', title: 'Task 2', status: TaskStatus.done, controls: [] },
      ],
    };
    render(<TreatmentPlanTab {...buildProps({ entity })} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
