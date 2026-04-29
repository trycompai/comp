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
      />,
    );

    expect(screen.queryByLabelText('Employee has completed a background check')).not.toBeInTheDocument();
  });
});
