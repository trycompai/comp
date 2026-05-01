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
  treatmentStrategy: RiskTreatmentType.mitigate,
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
  it('renders the Linked work column when Mitigate has linked tasks', () => {
    const entity: TreatmentPlanEntity = {
      ...baseEntity,
      treatmentStrategy: RiskTreatmentType.mitigate,
      tasks: [{ id: 't1', title: 'Task 1', status: TaskStatus.todo, controls: [] }],
    };
    render(<TreatmentPlanTab {...buildProps({ entity })} />);
    expect(screen.getByRole('heading', { name: 'Strategy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Treatment plan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Linked work' })).toBeInTheDocument();
  });

  it('hides Linked work column and stacks the empty CTA in col 02 when Mitigate has no linked tasks', () => {
    render(<TreatmentPlanTab {...buildProps()} />);
    expect(screen.getByRole('heading', { name: 'Strategy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Treatment plan' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Linked work' })).toBeNull();
  });

  it('hides Linked Work and shows "Rationale" when strategy is Accept', () => {
    const entity: TreatmentPlanEntity = {
      ...baseEntity,
      treatmentStrategy: RiskTreatmentType.accept,
    };
    render(<TreatmentPlanTab {...buildProps({ entity })} />);
    // Column titles render as <h3>; queries are role-scoped to disambiguate
    // from the hero's "Strategy" stat label.
    expect(screen.getByRole('heading', { name: 'Strategy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rationale' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Linked work' })).toBeNull();
  });

  it('renders the hero numerals using strategy-derived residual', () => {
    // strategy=mitigate, no tasks → completion=0 → preview residual = inherent.
    // inherent: likely × major = 16 raw → score = ceil(16/2.5) = 7
    render(<TreatmentPlanTab {...buildProps()} />);
    const headline = screen.getByLabelText(/From 7 to 7 out of 10/i);
    expect(headline).toBeInTheDocument();
    expect(headline.textContent).toContain('7');
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
