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

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock use-findings-api
vi.mock('@/hooks/use-findings-api', () => ({
  DEFAULT_FINDING_TEMPLATES: [
    {
      id: 'default_1',
      title: 'Default Template',
      content: 'Default content',
      category: 'general',
      type: 'soc2',
    },
  ],
  FINDING_CATEGORY_LABELS: { general: 'General' },
  FINDING_TYPE_FRAMEWORK_OPTIONS: [
    { value: 'soc2', label: 'SOC 2' },
    { value: 'iso27001', label: 'ISO 27001' },
    { value: 'pci_dss', label: 'PCI DSS' },
    { value: 'hipaa', label: 'HIPAA' },
    { value: 'gdpr', label: 'GDPR' },
    { value: 'iso9001', label: 'ISO 9001' },
    { value: 'iso42001', label: 'ISO 42001' },
  ],
  FINDING_TYPE_LABELS: { soc2: 'SOC 2', iso27001: 'ISO 27001' },
  useFindingActions: () => ({
    createFinding: vi.fn(),
  }),
  useFindingTemplates: () => ({
    data: { data: [] },
  }),
}));

// Mock @db
vi.mock('@db', () => ({
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
  },
}));

// Mock @trycompai/ui components
vi.mock('@trycompai/ui/form', () => ({
  Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render, name }: any) => {
    const field = { value: name === 'type' ? 'soc2' : '', onChange: vi.fn() };
    return <div data-testid={`form-field-${name}`}>{render({ field })}</div>;
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@trycompai/ui/hooks', () => ({
  useMediaQuery: () => true, // always desktop
}));

// Mock @hookform/resolvers/zod
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.();
      fn({ type: 'soc2', templateId: null, content: 'test' });
    },
    watch: () => null,
    setValue: vi.fn(),
    reset: vi.fn(),
  }),
}));

// Mock design system components
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Drawer: ({ children }: any) => <div>{children}</div>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <h2>{children}</h2>,
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, disabled }: any) => (
    <div
      data-testid={`select-item-${value}`}
      data-disabled={disabled ? 'true' : 'false'}
    >
      {children}
    </div>
  ),
  SelectLabel: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetBody: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
}));

import { CreateFindingSheet } from './CreateFindingSheet';

const defaultProps = {
  taskId: 'task_123',
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
};

describe('CreateFindingSheet permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('renders sheet with form when open', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateFindingSheet {...defaultProps} />);

    // "Create Finding" appears as both sheet title and button text
    expect(screen.getAllByText('Create Finding').length).toBeGreaterThanOrEqual(1);
  });

  it('enables submit button for admin with finding:create', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateFindingSheet {...defaultProps} />);

    const submitButtons = screen.getAllByText('Create Finding');
    // The submit button is the one inside the form
    const submitButton = submitButtons.find(
      (el) => el.closest('button') && !el.closest('h2'),
    );
    expect(submitButton?.closest('button')).not.toBeDisabled();
  });

  it('disables submit button when user lacks finding:create', () => {
    setMockPermissions({});

    render(<CreateFindingSheet {...defaultProps} />);

    const submitButtons = screen.getAllByText('Create Finding');
    const submitButton = submitButtons.find(
      (el) => el.closest('button') && !el.closest('h2'),
    );
    expect(submitButton?.closest('button')).toBeDisabled();
  });

  it('disables submit button for auditor if auditor lacks finding:create', () => {
    // Check what auditor actually gets
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<CreateFindingSheet {...defaultProps} />);

    const hasCreate = mockHasPermission('finding', 'create');
    const submitButtons = screen.getAllByText('Create Finding');
    const submitButton = submitButtons.find(
      (el) => el.closest('button') && !el.closest('h2'),
    );

    if (hasCreate) {
      expect(submitButton?.closest('button')).not.toBeDisabled();
    } else {
      expect(submitButton?.closest('button')).toBeDisabled();
    }
  });

  it('does not render when sheet is closed', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateFindingSheet {...defaultProps} open={false} />);

    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('shows all required frameworks in finding type dropdown options', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateFindingSheet {...defaultProps} />);

    expect(screen.getByText('SOC 2')).toBeInTheDocument();
    expect(screen.getByText('ISO 27001')).toBeInTheDocument();
    expect(screen.getByText('PCI DSS')).toBeInTheDocument();
    expect(screen.getByText('HIPAA')).toBeInTheDocument();
    expect(screen.getByText('GDPR')).toBeInTheDocument();
    expect(screen.getByText('ISO 9001')).toBeInTheDocument();
    expect(screen.getByText('ISO 42001')).toBeInTheDocument();
  });

  it('only enables framework options currently supported by FindingType enum', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<CreateFindingSheet {...defaultProps} />);

    expect(screen.getByTestId('select-item-soc2')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByTestId('select-item-iso27001')).toHaveAttribute('data-disabled', 'false');
    expect(screen.getByTestId('select-item-pci_dss')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('select-item-hipaa')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('select-item-gdpr')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('select-item-iso9001')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('select-item-iso42001')).toHaveAttribute('data-disabled', 'true');
  });
});
