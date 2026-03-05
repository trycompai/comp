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

// Mock useVendorActions
vi.mock('@/hooks/use-vendors', () => ({
  useVendorActions: () => ({
    updateVendor: vi.fn(),
  }),
}));

// Mock swr
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock nuqs
vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()],
}));

// Mock @comp/ui components
vi.mock('@comp/ui/button', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/form', () => ({
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

// Mock design system components
vi.mock('@trycompai/design-system', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  Stack: ({ children }: any) => <div>{children}</div>,
}));

import { ResidualRiskForm } from './ResidualRiskForm';

describe('ResidualRiskForm', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('disables the submit button when user lacks vendor:update permission', () => {
    setMockPermissions({});

    render(<ResidualRiskForm vendorId="vendor-1" />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables the submit button for auditor without vendor:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<ResidualRiskForm vendorId="vendor-1" />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables the submit button when user has vendor:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<ResidualRiskForm vendorId="vendor-1" />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('renders the form fields regardless of permissions', () => {
    setMockPermissions({});

    render(<ResidualRiskForm vendorId="vendor-1" />);

    expect(screen.getByText('Residual Probability')).toBeInTheDocument();
    expect(screen.getByText('Residual Impact')).toBeInTheDocument();
  });

  it('enables submit when user has only vendor:update permission', () => {
    setMockPermissions({ vendor: ['update'] });

    render(<ResidualRiskForm vendorId="vendor-1" />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('disables submit when user has vendor:read but not vendor:update', () => {
    setMockPermissions({ vendor: ['read'] });

    render(<ResidualRiskForm vendorId="vendor-1" />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeDisabled();
  });
});
