import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useTaskMutations
vi.mock('@/hooks/use-task-mutations', () => ({
  useTaskMutations: () => ({
    createTask: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ vendorId: 'vendor-1' }),
}));

// Mock nuqs
vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()],
}));

// Mock SelectAssignee
vi.mock('@/components/SelectAssignee', () => ({
  SelectAssignee: () => <div data-testid="select-assignee" />,
}));

// Mock @gideon-defender/ui components
vi.mock('@gideon-defender/ui/accordion', () => ({
  Accordion: ({ children }: any) => <div>{children}</div>,
  AccordionContent: ({ children }: any) => <div>{children}</div>,
  AccordionItem: ({ children }: any) => <div>{children}</div>,
  AccordionTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@gideon-defender/ui/button', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@gideon-defender/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

vi.mock('@gideon-defender/ui/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@gideon-defender/ui/form', () => ({
  Form: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render, name }: any) => (
    <div data-testid={`form-field-${name}`}>
      {render({ field: { value: '', onChange: vi.fn() } })}
    </div>
  ),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@gideon-defender/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@gideon-defender/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@gideon-defender/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

import { CreateVendorTaskForm } from './create-vendor-task-form';

const mockAssignees: any[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: 'admin',
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  },
];

describe('CreateVendorTaskForm', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('disables the submit button when user lacks task:create permission', () => {
    setMockPermissions({});

    render(<CreateVendorTaskForm assignees={mockAssignees} />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables the submit button for auditor without task:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<CreateVendorTaskForm assignees={mockAssignees} />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables the submit button when user has task:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateVendorTaskForm assignees={mockAssignees} />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('renders the form fields regardless of permissions', () => {
    setMockPermissions({});

    render(<CreateVendorTaskForm assignees={mockAssignees} />);

    expect(screen.getByText('Task Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
  });

  it('enables submit when user has only task:create permission', () => {
    setMockPermissions({ task: ['create'] });

    render(<CreateVendorTaskForm assignees={mockAssignees} />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    expect(submitButton).not.toBeDisabled();
  });
});
