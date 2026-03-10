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

const mockDeleteSecret = vi.fn();

vi.mock('../../hooks/useSecrets', () => ({
  useSecrets: (options?: { initialData?: unknown[] }) => ({
    secrets: options?.initialData ?? [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createSecret: vi.fn(),
    updateSecret: vi.fn(),
    deleteSecret: mockDeleteSecret,
  }),
}));

vi.mock('../EditSecretDialog', () => ({
  EditSecretDialog: () => <div data-testid="edit-secret-dialog" />,
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { secret: { value: 'test-value' } } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Copy: () => <span data-testid="copy-icon" />,
}));

vi.mock('@trycompai/design-system', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: any) => (
    <button data-testid="actions-dropdown-trigger">{children}</button>
  ),
  Empty: ({ children }: any) => <div data-testid="empty-state">{children}</div>,
  EmptyDescription: ({ children }: any) => <p>{children}</p>,
  EmptyHeader: ({ children }: any) => <div>{children}</div>,
  EmptyTitle: ({ children }: any) => <h3>{children}</h3>,
  HStack: ({ children }: any) => <div>{children}</div>,
  InputGroup: ({ children }: any) => <div>{children}</div>,
  InputGroupAddon: ({ children }: any) => <div>{children}</div>,
  InputGroupInput: (props: any) => <input {...props} />,
  Spinner: () => <span data-testid="spinner" />,
  Stack: ({ children }: any) => <div>{children}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Edit: () => <span data-testid="edit-icon" />,
  OverflowMenuVertical: () => <span data-testid="overflow-icon" />,
  Search: () => <span data-testid="search-icon" />,
  TrashCan: () => <span data-testid="trash-icon" />,
  View: () => <span data-testid="view-icon" />,
  ViewOff: () => <span data-testid="viewoff-icon" />,
}));

import { SecretsTable } from './SecretsTable';
import type { Secret } from '../../hooks/useSecrets';

const sampleSecrets: Secret[] = [
  {
    id: 'secret-1',
    name: 'GITHUB_TOKEN',
    description: 'GitHub access token',
    category: 'api_keys',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    lastUsedAt: '2024-06-01',
  },
  {
    id: 'secret-2',
    name: 'OPENAI_KEY',
    description: null,
    category: null,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
    lastUsedAt: null,
  },
];

describe('SecretsTable permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ACTIONS column when user has organization:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<SecretsTable initialSecrets={sampleSecrets} />);

    expect(screen.getByText('ACTIONS')).toBeInTheDocument();
  });

  it('hides ACTIONS column when user lacks organization:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<SecretsTable initialSecrets={sampleSecrets} />);

    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('hides ACTIONS column when user has no permissions', () => {
    setMockPermissions({});
    render(<SecretsTable initialSecrets={sampleSecrets} />);

    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('renders dropdown triggers for each secret when user has permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<SecretsTable initialSecrets={sampleSecrets} />);

    const triggers = screen.getAllByTestId('actions-dropdown-trigger');
    expect(triggers).toHaveLength(sampleSecrets.length);
  });

  it('does not render dropdown triggers when user lacks permission', () => {
    setMockPermissions({});
    render(<SecretsTable initialSecrets={sampleSecrets} />);

    expect(screen.queryByTestId('actions-dropdown-trigger')).not.toBeInTheDocument();
  });

  it('displays secret names regardless of permissions', () => {
    setMockPermissions({});
    render(<SecretsTable initialSecrets={sampleSecrets} />);

    expect(screen.getByText('GITHUB_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('OPENAI_KEY')).toBeInTheDocument();
  });

  it('shows empty state when no secrets provided', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<SecretsTable initialSecrets={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No secrets yet')).toBeInTheDocument();
  });
});
