import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmployeePageHeader } from './EmployeePageHeader';
import type { BackgroundCheckRecord } from './backgroundCheckTypes';

const backgroundCheck = {
  id: 'bcr_1',
  employeeName: 'Jane Doe',
  employeeEmail: 'jane@example.com',
  requesterNotes: null,
  candidateUrl: null,
  status: 'completed',
  identityStatus: null,
  employmentStatus: null,
  referenceStatus: null,
  rightToWorkStatus: null,
  adjudicationStatus: null,
  lastSyncedAt: null,
  reportSnapshot: null,
  reportSyncedAt: null,
} satisfies BackgroundCheckRecord;

describe('EmployeePageHeader', () => {
  it('shows a verified tick when the background check is complete', () => {
    render(
      <EmployeePageHeader
        employeeName="Jane Doe"
        orgId="org_123"
        backgroundCheck={backgroundCheck}
        backgroundCheckStepEnabled={true}
        memberBackgroundCheckExempt={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByLabelText('Employee has completed a background check')).toBeInTheDocument();
  });

  it('does not show the verified tick before completion', () => {
    render(
      <EmployeePageHeader
        employeeName="Jane Doe"
        orgId="org_123"
        backgroundCheck={{ ...backgroundCheck, status: 'invited' }}
        backgroundCheckStepEnabled={true}
        memberBackgroundCheckExempt={false}
      />,
    );

    expect(screen.queryByLabelText('Employee has completed a background check')).not.toBeInTheDocument();
  });

  it('hides the verified tick when background checks are bypassed, even if the check is complete', () => {
    render(
      <EmployeePageHeader
        employeeName="Jane Doe"
        orgId="org_123"
        backgroundCheck={backgroundCheck}
        backgroundCheckStepEnabled={false}
        memberBackgroundCheckExempt={false}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Employee has completed a background check')).not.toBeInTheDocument();
  });

  it('hides the verified tick when the member is exempt', () => {
    render(
      <EmployeePageHeader
        employeeName="Jane Doe"
        orgId="org_123"
        backgroundCheck={backgroundCheck}
        backgroundCheckStepEnabled={true}
        memberBackgroundCheckExempt={true}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Employee has completed a background check'),
    ).not.toBeInTheDocument();
  });
});
