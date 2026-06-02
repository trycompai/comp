import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsInterestedParty } from '../isms-types';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { InterestedPartiesRow } from './InterestedPartiesRow';

function makeParty(overrides: Partial<IsmsInterestedParty> = {}): IsmsInterestedParty {
  return {
    id: 'p1',
    name: 'Regulators',
    category: 'Regulator',
    needsExpectations: 'Compliance with the law',
    source: 'manual',
    derivedFrom: null,
    position: 0,
    ...overrides,
  };
}

describe('InterestedPartiesRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exits edit mode after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <InterestedPartiesRow
        party={makeParty()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit interested party'));
    fireEvent.change(screen.getByLabelText('Interested party name'), {
      target: { value: 'Updated name' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // Back in read mode: the edit affordance returns, inputs are gone.
    await waitFor(() => expect(screen.getByLabelText('Edit interested party')).toBeInTheDocument());
    expect(screen.queryByLabelText('Interested party name')).not.toBeInTheDocument();
  });

  it('keeps the user in edit mode with their changes when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
    render(
      <InterestedPartiesRow
        party={makeParty()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit interested party'));
    const nameInput = screen.getByLabelText('Interested party name');
    fireEvent.change(nameInput, { target: { value: 'Unsaved edit' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // Still editing, and the user's unsaved input is preserved.
    expect(screen.getByLabelText('Interested party name')).toHaveValue('Unsaved edit');
  });

  it('re-syncs the draft from a changed record while not editing', () => {
    const { rerender } = render(
      <InterestedPartiesRow
        party={makeParty()}
        canEdit
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    // Updated record arrives (e.g. after a revalidation) while in read mode.
    rerender(
      <InterestedPartiesRow
        party={makeParty({ name: 'Renamed party' })}
        canEdit
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    // Entering edit shows the fresh value, not the stale initial one.
    fireEvent.click(screen.getByLabelText('Edit interested party'));
    expect(screen.getByLabelText('Interested party name')).toHaveValue('Renamed party');
  });
});
