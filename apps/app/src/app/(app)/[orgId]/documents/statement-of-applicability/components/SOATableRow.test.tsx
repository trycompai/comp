import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SOATableRow } from './SOATableRow';

vi.mock('../hooks/useSOADocument', () => ({
  useSOADocument: () => ({
    saveAnswer: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const physicalSecurityQuestion = {
  id: 'q_7_2',
  text: 'Secure areas shall be protected by appropriate entry controls and access points.',
  columnMapping: {
    closure: '7.2',
    title: 'Physical entry',
    control_objective: null,
    isApplicable: null,
    justification: null,
  },
};

describe('SOATableRow', () => {
  it('renders an edit action for a fully remote org\'s physical-security (7.x) control', () => {
    // Regression (CS-749): 7.x controls on a fully remote org were shown as Not
    // Applicable with no edit icon, so the org could not change them. They must
    // stay editable — the org can move to a physical office at any time.
    render(
      <table>
        <tbody>
          <SOATableRow
            question={physicalSecurityQuestion}
            columns={[{ name: 'isApplicable', type: 'boolean' }]}
            answerData={{
              answer:
                'This control is not applicable as our organization operates fully remotely.',
              answerVersion: 1,
              isApplicable: false,
            }}
            isFullyRemote
            documentId="doc_1"
            isPendingApproval={false}
            organizationId="org_1"
          />
        </tbody>
      </table>,
    );

    expect(
      screen.getByRole('button', { name: 'Edit answer' }),
    ).toBeInTheDocument();
  });
});
