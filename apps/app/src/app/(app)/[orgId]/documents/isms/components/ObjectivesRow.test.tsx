import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsObjective } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { ObjectivesRow } from './ObjectivesRow';

const OWNER_OPTIONS: ApproverOption[] = [{ id: 'm1', name: 'Owner One' }];

function makeObjective(overrides: Partial<IsmsObjective> = {}): IsmsObjective {
  return {
    id: 'o1',
    objective: 'Reduce phishing click rate',
    target: 'Below 3%',
    ownerMemberId: 'm1',
    cadence: 'Quarterly',
    plan: 'Run quarterly phishing simulations',
    measurementMethod: 'Simulation results',
    status: 'on_track',
    source: 'manual',
    derivedFrom: null,
    position: 0,
    ...overrides,
  };
}

describe('ObjectivesRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exits edit mode after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ObjectivesRow
        objective={makeObjective()}
        canEdit
        ownerOptions={OWNER_OPTIONS}
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit objective'));
    fireEvent.change(screen.getByLabelText('Objective'), {
      target: { value: 'Updated objective' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ objective: 'Updated objective', status: 'on_track' }),
    );
    await waitFor(() => expect(screen.getByLabelText('Edit objective')).toBeInTheDocument());
    expect(screen.queryByLabelText('Objective')).not.toBeInTheDocument();
  });

  it('keeps the user in edit mode with their changes when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
    render(
      <ObjectivesRow
        objective={makeObjective()}
        canEdit
        ownerOptions={OWNER_OPTIONS}
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit objective'));
    fireEvent.change(screen.getByLabelText('Objective'), {
      target: { value: 'Unsaved objective' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByLabelText('Objective')).toHaveValue('Unsaved objective');
  });

  it('re-syncs the form from a changed record while not editing', async () => {
    const { rerender } = render(
      <ObjectivesRow
        objective={makeObjective()}
        canEdit
        ownerOptions={OWNER_OPTIONS}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await act(async () => {
      rerender(
        <ObjectivesRow
          objective={makeObjective({ objective: 'Revalidated objective' })}
          canEdit
          ownerOptions={OWNER_OPTIONS}
          onSave={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />,
      );
    });

    fireEvent.click(screen.getByLabelText('Edit objective'));
    expect(screen.getByLabelText('Objective')).toHaveValue('Revalidated objective');
  });

  it('blocks saving when the objective is cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ObjectivesRow
        objective={makeObjective()}
        canEdit
        ownerOptions={OWNER_OPTIONS}
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit objective'));
    fireEvent.change(screen.getByLabelText('Objective'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByLabelText('Objective')).toHaveValue(''));
    expect(onSave).not.toHaveBeenCalled();
  });
});
