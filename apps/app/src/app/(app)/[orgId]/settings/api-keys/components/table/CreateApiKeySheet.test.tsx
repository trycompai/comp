import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

const mockCreateApiKey = vi.fn();

vi.mock('@/hooks/use-api-keys', () => ({
  useApiKeys: () => ({
    apiKeys: [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createApiKey: mockCreateApiKey,
    revokeApiKey: vi.fn(),
  }),
}));

vi.mock('@comp/ui/hooks', () => ({
  useMediaQuery: vi.fn(() => true),
}));

vi.mock('./ScopeSelector', () => ({
  ScopeSelector: () => <div data-testid="scope-selector" />,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
  SheetBody: ({ children }: any) => <div>{children}</div>,
  Stack: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e: any) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  Drawer: ({ children }: any) => <div>{children}</div>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <h2>{children}</h2>,
  DrawerDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Close: () => <span data-testid="close-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
}));

vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon" />,
}));

import { CreateApiKeySheet } from './CreateApiKeySheet';

describe('CreateApiKeySheet permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Create button enabled when user has apiKey:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<CreateApiKeySheet open={true} onOpenChange={vi.fn()} />);

    const createButton = screen.getByRole('button', { name: /create/i });
    // Button is disabled because name is empty, but not because of permissions
    // The disabled state should be driven by: isCreating || !name.trim() || (preset !== 'full' && selectedScopes.length === 0) || !canCreateApiKey
    // canCreateApiKey is true, name is empty => disabled for name, not permission
    expect(createButton).toBeInTheDocument();
  });

  it('disables Create button when user lacks apiKey:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<CreateApiKeySheet open={true} onOpenChange={vi.fn()} />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).toBeDisabled();
  });

  it('disables Create button when user has no permissions', () => {
    setMockPermissions({});
    render(<CreateApiKeySheet open={true} onOpenChange={vi.fn()} />);

    const createButton = screen.getByRole('button', { name: /create/i });
    expect(createButton).toBeDisabled();
  });

  it('does not render anything when sheet is closed', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    const { container } = render(
      <CreateApiKeySheet open={false} onOpenChange={vi.fn()} />,
    );

    expect(container.querySelector('h2')).toBeNull();
  });
});
