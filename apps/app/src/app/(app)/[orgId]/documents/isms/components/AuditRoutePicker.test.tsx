import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsRole } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { AuditRoutePicker } from './AuditRoutePicker';

const MEMBERS: ApproverOption[] = [
  { id: 'mem_1', name: 'Alex Petrisor' },
  { id: 'mem_2', name: 'Jordan Lee' },
];

function auditorRole(overrides: Partial<IsmsRole> = {}): IsmsRole {
  return {
    id: 'role_ia',
    roleKey: 'internal_auditor',
    name: 'Internal Auditor',
    description: '',
    responsibilities: '',
    authorities: '',
    authorityGrantedBy: 'Top Management',
    requiredCompetence: '',
    auditRoute: null,
    auditRouteMemberId: null,
    auditFirmName: null,
    auditEvidenceRef: null,
    auditCourse: null,
    auditDueDate: null,
    source: 'derived',
    derivedFrom: null,
    position: 3,
    assignments: [],
    ...overrides,
  };
}

describe('AuditRoutePicker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('warns when the in-house auditor is also the SPO', () => {
    render(
      <AuditRoutePicker
        role={auditorRole({ auditRoute: 'in_house', auditRouteMemberId: 'mem_1' })}
        canEdit
        memberOptions={MEMBERS}
        spoMemberIds={['mem_1']}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByText(/is also assigned as the Security/)).toBeInTheDocument();
  });

  it('does not warn when the in-house auditor is not the SPO', () => {
    render(
      <AuditRoutePicker
        role={auditorRole({ auditRoute: 'in_house', auditRouteMemberId: 'mem_2' })}
        canEdit
        memberOptions={MEMBERS}
        spoMemberIds={['mem_1']}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.queryByText(/is also assigned as the Security/)).not.toBeInTheDocument();
  });

  it('saves an external route, clearing in-house/training fields', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AuditRoutePicker
        role={auditorRole({ auditRoute: 'external', auditFirmName: 'Acme' })}
        canEdit
        memberOptions={MEMBERS}
        spoMemberIds={[]}
        onSave={onSave}
      />,
    );

    // Make the form dirty so Save enables, then submit.
    fireEvent.change(screen.getByLabelText('External auditor evidence reference'), {
      target: { value: 'LA cert #123' },
    });
    fireEvent.click(screen.getByText('Save audit route'));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        auditRoute: 'external',
        auditFirmName: 'Acme',
        auditEvidenceRef: 'LA cert #123',
        auditRouteMemberId: null,
        auditCourse: null,
        auditDueDate: null,
      }),
    );
  });
});
