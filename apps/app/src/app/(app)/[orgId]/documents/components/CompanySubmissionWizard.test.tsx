import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeEventHandler, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Capture client-side navigation so we can assert when the wizard leaves the page.
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

// next/link is only referenced by the pre-fix Cancel control; keep it inert.
vi.mock('next/link', () => ({
  default: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

vi.mock('@trycompai/company', () => ({ meetingFields: () => [] }));
vi.mock('@/components/file-uploader', () => ({ FileUploader: () => null }));
vi.mock('@/lib/api-client', () => ({ api: { post: vi.fn() } }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Minimal evidence form: one text field on step 1 is enough to exercise the
// unsaved-changes guard without depending on real form catalog content.
vi.mock('@/app/(app)/[orgId]/documents/forms', async () => {
  const { z } = await import('zod');
  return {
    evidenceFormDefinitions: {
      'tabletop-exercise': {
        title: 'Tabletop Exercise',
        submissionDateMode: 'auto',
        fields: [{ key: 'summary', label: 'Summary', type: 'text' }],
      },
    },
    evidenceFormSubmissionSchemaMap: {
      'tabletop-exercise': z.object({ summary: z.string().min(1) }),
    },
    meetingMinutesPlaceholders: {},
    meetingSubTypes: [],
  };
});

// Faithful-enough design system: AlertDialog honours `open`, inputs/buttons
// forward the handlers the wizard relies on.
vi.mock('@trycompai/design-system', () => ({
  Alert: ({ title, description }: { title?: ReactNode; description?: ReactNode }) => (
    <div>
      {title}
      {description}
    </div>
  ),
  Button: ({
    children,
    onClick,
    type,
    disabled,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }) => (
    <button onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  ),
  Field: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FieldError: () => null,
  FieldGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  FieldLabel: ({ children, htmlFor }: { children?: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  Input: ({
    id,
    type,
    value,
    onChange,
    placeholder,
  }: {
    id?: string;
    type?: string;
    value?: string;
    onChange?: ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
  }) => (
    <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} />
  ),
  Section: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Select: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Textarea: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id?: string;
    value?: string;
    onChange?: ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
  }) => <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} />,
  AlertDialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

import { CompanySubmissionWizard } from './CompanySubmissionWizard';

const ORG_ID = 'org_test';
const DOCS_URL = `/${ORG_ID}/documents/tabletop-exercise`;

function renderWizard() {
  return render(
    <CompanySubmissionWizard
      organizationId={ORG_ID}
      formType={'tabletop-exercise' as never}
    />,
  );
}

describe('CompanySubmissionWizard cancel guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirms before discarding when the form has unsaved changes', async () => {
    renderWizard();

    // Enter data so the form becomes dirty.
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Annual DR tabletop' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Instead of navigating away, the wizard asks for confirmation.
    expect(await screen.findByText('Discard submission?')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    // Only after confirming does it leave the page.
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(mockPush).toHaveBeenCalledWith(DOCS_URL);
  });

  it('navigates immediately when there are no unsaved changes', () => {
    renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Discard submission?')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith(DOCS_URL);
  });
});
