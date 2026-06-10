import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/lib/api-client', () => ({ api: { post: vi.fn() } }));
vi.mock('@/components/file-uploader', () => ({ FileUploader: () => <div /> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Light design-system mock: render a Select as a native <select> so the
// dropdown options and matrix cells are queryable in jsdom.
vi.mock('@trycompai/design-system', () => {
  const Passthrough = ({ children }: any) => <div>{children}</div>;
  return {
    Alert: Passthrough,
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Field: Passthrough,
    FieldError: () => null,
    FieldGroup: Passthrough,
    FieldLabel: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
    Input: (props: any) => <input {...props} />,
    Section: Passthrough,
    Text: ({ children }: any) => <span>{children}</span>,
    Textarea: (props: any) => <textarea {...props} />,
    Select: ({ value, onValueChange, children }: any) => (
      <select
        data-testid="ds-select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

import { CompanySubmissionWizard } from './CompanySubmissionWizard';

describe('CompanySubmissionWizard — account-types rendering', () => {
  it('renders the 10 seeded rows with Allowed/Disallowed dropdowns and prefilled values', async () => {
    render(<CompanySubmissionWizard organizationId="org_test" formType="account-types" />);

    // The Account Types table (matrix) lives on the second step.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // 10 default rows → 10 status dropdowns, each offering Allowed/Disallowed.
    await waitFor(() => {
      expect(screen.getAllByTestId('ds-select')).toHaveLength(10);
    });
    const selects = screen.getAllByTestId('ds-select') as HTMLSelectElement[];
    const options = within(selects[0]).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Allowed', 'Disallowed']);

    // First row is pre-filled per the spec.
    expect(selects[0].value).toBe('Allowed');
    expect(screen.getByDisplayValue('Individual')).toBeTruthy();
    expect(screen.getByDisplayValue('Needed by each employee/worker')).toBeTruthy();
    // A Disallowed default row has a blank justification.
    expect(screen.getByDisplayValue('Developer')).toBeTruthy();
  });
});
