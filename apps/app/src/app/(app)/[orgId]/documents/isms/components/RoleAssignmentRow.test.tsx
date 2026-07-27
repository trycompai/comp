import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsRoleAssignment } from '../isms-types';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { RoleAssignmentRow } from './RoleAssignmentRow';

function makeAssignment(overrides: Partial<IsmsRoleAssignment> = {}): IsmsRoleAssignment {
  return {
    id: 'ra_1',
    roleId: 'role_1',
    memberId: 'mem_1',
    basisOfCompetence: 'training',
    evidenceRetained: 'Training record',
    gap: null,
    remediationAction: null,
    remediationDueDate: null,
    position: 0,
    ...overrides,
  };
}

describe('RoleAssignmentRow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the member name and competence basis in read view', () => {
    render(
      <RoleAssignmentRow
        assignment={makeAssignment()}
        memberName="Alex Petrisor"
        canEdit
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onRemove={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByText('Alex Petrisor')).toBeInTheDocument();
    expect(screen.getByText('Training')).toBeInTheDocument();
  });

  it('flags a gap and reveals remediation fields when a gap is present', () => {
    render(
      <RoleAssignmentRow
        assignment={makeAssignment({ gap: 'Needs ISO 27001 course', remediationAction: 'Enrol' })}
        memberName="Alex"
        canEdit
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onRemove={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    // Read view surfaces the gap text + remediation ('Gap' appears as both a
    // badge and a field label, so assert on the unique values instead).
    expect(screen.getByText('Needs ISO 27001 course')).toBeInTheDocument();
    expect(screen.getByText('Enrol')).toBeInTheDocument();
  });

  it('saves edited competence via onUpdate', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <RoleAssignmentRow
        assignment={makeAssignment({ gap: 'Needs course' })}
        memberName="Alex"
        canEdit
        onUpdate={onUpdate}
        onRemove={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByLabelText('Edit competence for Alex'));
    // Remediation fields are visible because a gap is set.
    expect(screen.getByLabelText('Remediation action')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Evidence retained'), {
      target: { value: 'Updated evidence' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceRetained: 'Updated evidence', gap: 'Needs course' }),
    );
  });
});
