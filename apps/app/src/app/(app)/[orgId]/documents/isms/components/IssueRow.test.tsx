import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsContextIssue } from '../isms-types';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { IssueRow } from './IssueRow';

function makeIssue(overrides: Partial<IsmsContextIssue> = {}): IsmsContextIssue {
  return {
    id: 'i1',
    kind: 'internal',
    category: 'Governance & Structure',
    description: 'Limited security awareness across teams',
    effect: 'Increases the likelihood of human-error incidents',
    source: 'manual',
    derivedFrom: null,
    position: 0,
    ...overrides,
  };
}

describe('IssueRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exits edit mode after a successful save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IssueRow
        issue={makeIssue()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit issue'));
    fireEvent.change(screen.getByLabelText('Issue description'), {
      target: { value: 'Updated issue' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Updated issue' }),
    );
    // Back in read mode: the edit affordance returns, inputs are gone.
    await waitFor(() => expect(screen.getByLabelText('Edit issue')).toBeInTheDocument());
    expect(screen.queryByLabelText('Issue description')).not.toBeInTheDocument();
  });

  it('keeps the user in edit mode with their changes when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('save failed'));
    render(
      <IssueRow
        issue={makeIssue()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit issue'));
    fireEvent.change(screen.getByLabelText('Issue description'), {
      target: { value: 'Unsaved edit' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    // Still editing, and the user's unsaved input is preserved.
    expect(screen.getByLabelText('Issue description')).toHaveValue('Unsaved edit');
  });

  it('re-syncs the form from a changed record while not editing', async () => {
    const { rerender } = render(
      <IssueRow
        issue={makeIssue()}
        canEdit
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await act(async () => {
      rerender(
        <IssueRow
          issue={makeIssue({ description: 'Revalidated issue' })}
          canEdit
          onSave={vi.fn().mockResolvedValue(undefined)}
          onDelete={vi.fn().mockResolvedValue(undefined)}
        />,
      );
    });

    fireEvent.click(screen.getByLabelText('Edit issue'));
    expect(screen.getByLabelText('Issue description')).toHaveValue('Revalidated issue');
  });

  it('blocks saving when a required field is cleared', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IssueRow
        issue={makeIssue()}
        canEdit
        onSave={onSave}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit issue'));
    fireEvent.change(screen.getByLabelText('Issue description'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(screen.getByLabelText('Issue description')).toHaveValue(''),
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
