import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsInterestedPartyRequirement } from '../isms-types';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { RequirementsRow } from './RequirementsRow';

function makeRequirement(
  overrides: Partial<IsmsInterestedPartyRequirement> = {},
): IsmsInterestedPartyRequirement {
  return {
    id: 'r1',
    interestedPartyId: null,
    partyName: 'Customers',
    requirement: 'Data must be encrypted at rest',
    treatment: 'AES-256 encryption applied to all stores',
    source: 'manual',
    derivedFrom: null,
    position: 0,
    ...overrides,
  };
}

describe('RequirementsRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exits edit mode after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <RequirementsRow
        requirement={makeRequirement()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit requirement'));
    fireEvent.change(screen.getByLabelText('Requirement description'), {
      target: { value: 'Encrypt in transit too' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ requirement: 'Encrypt in transit too' }),
    );
    await waitFor(() => expect(screen.getByLabelText('Edit requirement')).toBeInTheDocument());
    expect(screen.queryByLabelText('Requirement description')).not.toBeInTheDocument();
  });

  it('keeps the user in edit mode with their changes when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
    render(
      <RequirementsRow
        requirement={makeRequirement()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit requirement'));
    fireEvent.change(screen.getByLabelText('Requirement description'), {
      target: { value: 'Unsaved requirement' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(screen.getByLabelText('Requirement description')).toHaveValue('Unsaved requirement');
  });

  it('re-syncs the form from a changed record while not editing', async () => {
    const { rerender } = render(
      <RequirementsRow
        requirement={makeRequirement()}
        canEdit
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await act(async () => {
      rerender(
        <RequirementsRow
          requirement={makeRequirement({ requirement: 'Revalidated requirement' })}
          canEdit
          onSave={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />,
      );
    });

    fireEvent.click(screen.getByLabelText('Edit requirement'));
    expect(screen.getByLabelText('Requirement description')).toHaveValue(
      'Revalidated requirement',
    );
  });

  it('blocks saving when a required field is cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <RequirementsRow
        requirement={makeRequirement()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit requirement'));
    fireEvent.change(screen.getByLabelText('Requirement party'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(screen.getByLabelText('Requirement party')).toHaveValue(''),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not surface a raw "Linked party ID" input', () => {
    render(
      <RequirementsRow
        requirement={makeRequirement({ interestedPartyId: 'isms_ip_abc123' })}
        canEdit
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit requirement'));

    expect(screen.queryByLabelText('Requirement party ID')).not.toBeInTheDocument();
    expect(screen.queryByText('Linked party ID (optional)')).not.toBeInTheDocument();
  });

  it('carries the system-managed party link through on save without exposing it', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <RequirementsRow
        requirement={makeRequirement({ interestedPartyId: 'isms_ip_abc123' })}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit requirement'));
    fireEvent.change(screen.getByLabelText('Requirement description'), {
      target: { value: 'Updated requirement text' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        interestedPartyId: 'isms_ip_abc123',
        requirement: 'Updated requirement text',
      }),
    );
  });
});
