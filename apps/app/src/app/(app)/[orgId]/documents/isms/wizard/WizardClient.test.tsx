import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WizardProfileResponse } from './wizard-types';

// ─── Mock the wizard hook ────────────────────────────────────
const mockSaveAnswers = vi.fn().mockResolvedValue({ id: 'p1', answers: {}, completedAt: null });
const mockComplete = vi
  .fn()
  .mockResolvedValue({ id: 'p1', answers: {}, completedAt: '2026-05-29' });
const mockGenerateAll = vi.fn().mockResolvedValue(undefined);

const hookState: { profile: WizardProfileResponse | null } = { profile: null };

vi.mock('../hooks/useIsmsWizard', () => ({
  useIsmsWizard: () => ({
    profile: hookState.profile,
    error: undefined,
    isLoading: false,
    mutate: vi.fn().mockResolvedValue(undefined),
    saveAnswers: mockSaveAnswers,
    complete: mockComplete,
    generateAll: mockGenerateAll,
  }),
}));

// ─── Mock next/navigation ────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Mock design system ──────────────────────────────────────
vi.mock('@trycompai/design-system', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    disabled,
    type,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} type={type}>
      {children}
    </button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked?: boolean;
    onCheckedChange?: (next: boolean) => void;
    'aria-label'?: string;
  }) => (
    <input
      type="checkbox"
      checked={!!checked}
      aria-label={ariaLabel}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  PageHeader: ({ title }: { title: React.ReactNode }) => <h1>{title}</h1>,
  Progress: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <div role="progressbar" aria-label={ariaLabel} />
  ),
  RadioGroup: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (next: string) => void;
    children: React.ReactNode;
  }) => (
    <div role="radiogroup" data-value={value} onClick={() => onValueChange?.('appointed')}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, 'aria-label': ariaLabel }: { value: string; 'aria-label'?: string }) => (
    <span data-value={value} aria-label={ariaLabel} />
  ),
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
  Switch: ({
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    checked?: boolean;
    onCheckedChange?: (next: boolean) => void;
    'aria-label'?: string;
  }) => (
    <input
      type="checkbox"
      role="switch"
      checked={!!checked}
      aria-label={ariaLabel}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span />,
  ArrowLeft: () => <span />,
  ArrowRight: () => <span />,
  Certificate: () => <span />,
  Checkmark: () => <span />,
  Save: () => <span />,
  TrashCan: () => <span />,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { WizardClient } from './WizardClient';

const PROFILE: WizardProfileResponse = {
  answers: null,
  defaults: {
    capabilitiesInProduction: ['Web app', 'Public API'],
    certificateScopeSentence: 'The provision of SaaS compliance tooling operating from AWS.',
    objectives: [
      { objective: 'Maintain availability', target: '99.9% uptime' },
      { objective: 'Protect customer data', target: 'Zero breaches' },
    ],
    intendedOutcomes: ['Achieve certification', 'Protect customer data'],
    cloudScopeSplit: {
      customer: ['Data', 'Databases', 'Application configuration'],
      provider: ['Underlying infrastructure'],
    },
    sectorRegulatorOptions: ['FINMA', 'FCA', 'HIPAA'],
  },
  members: [
    { id: 'm1', name: 'Alice Owner' },
    { id: 'm2', name: 'Bob Admin' },
  ],
};

const baseProps = {
  organizationId: 'org-1',
  frameworkId: 'fr-iso',
  fallbackData: PROFILE,
};

describe('WizardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.profile = PROFILE;
  });

  it('renders the first step pre-filled from defaults and members', () => {
    render(<WizardClient {...baseProps} />);

    expect(screen.getByText('ISMS setup wizard')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('Leadership & accountability')).toBeInTheDocument();
    // Member option from the profile is rendered in the deputy picker.
    expect(screen.getByText('Alice Owner')).toBeInTheDocument();
  });

  it('saves the active step partial then advances on Next', async () => {
    render(<WizardClient {...baseProps} />);

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(mockSaveAnswers).toHaveBeenCalledTimes(1);
    });
    // Step 1 owns deputySpo + internalAuditApproach only — partial save.
    const payload = mockSaveAnswers.mock.calls[0][0];
    expect(Object.keys(payload).sort()).toEqual(['deputySpo', 'internalAuditApproach']);
    expect(payload.deputySpo).toEqual({ memberId: null, toBeNamed: false });

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 6')).toBeInTheDocument();
    });
    expect(screen.getByText('External commitments')).toBeInTheDocument();
  });

  it('goes back to the previous step without saving', async () => {
    render(<WizardClient {...baseProps} />);

    fireEvent.click(screen.getByText('Next'));
    await waitFor(() => expect(screen.getByText('Step 2 of 6')).toBeInTheDocument());

    mockSaveAnswers.mockClear();
    fireEvent.click(screen.getByText('Back'));

    await waitFor(() => expect(screen.getByText('Step 1 of 6')).toBeInTheDocument());
    expect(mockSaveAnswers).not.toHaveBeenCalled();
  });

  it('completes then generates all documents and routes back on finish', async () => {
    render(<WizardClient {...baseProps} />);

    // Walk through to the final step.
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(screen.getByText('Next'));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByText(`Step ${i + 2} of 6`)).toBeInTheDocument());
    }

    expect(screen.getByText('Targets & outcomes')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Finish & generate'));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledTimes(1);
    });
    expect(mockGenerateAll).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/org-1/documents?tab=iso-27001');
    });

    // Completion sends the full set of answers.
    const completePayload = mockComplete.mock.calls[0][0];
    expect(completePayload).toHaveProperty('certificateScopeSentence');
    expect(completePayload).toHaveProperty('objectives');
  });
});
