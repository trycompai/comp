import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  NO_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock design system components to simple HTML elements
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DataTableFilters: ({ children }: any) => <div data-testid="filters">{children}</div>,
  DataTableHeader: ({ children }: any) => <div data-testid="header">{children}</div>,
  DataTableSearch: ({ placeholder }: any) => (
    <input placeholder={placeholder} data-testid="search" />
  ),
  HStack: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: any) => <td colSpan={colSpan}>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children, onClick, onKeyDown, role, tabIndex }: any) => (
    <tr onClick={onClick} onKeyDown={onKeyDown} role={role} tabIndex={tabIndex}>
      {children}
    </tr>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  ArrowDown: () => <span data-testid="arrow-down" />,
  ArrowUp: () => <span data-testid="arrow-up" />,
}));

// Mock StatusIndicator
vi.mock('@/components/status-indicator', () => ({
  StatusIndicator: ({ status }: { status: string }) => (
    <span data-testid="status-indicator">{status}</span>
  ),
}));

// Mock utils
vi.mock('../lib/utils', () => ({
  getControlStatus: () => 'completed',
}));

// Helper to create a resolved promise that React.use() can unwrap synchronously
function createResolvedPromise(data: any): Promise<any> {
  const promise = Promise.resolve(data);
  // Attach the result so React.use() can read it synchronously in tests
  (promise as any).status = 'fulfilled';
  (promise as any).value = data;
  return promise;
}

// We need to mock React.use since it requires Suspense boundary in real usage
const mockControlsData = [
  {
    id: 'ctrl-1',
    name: 'Access Control',
    policies: [],
    tasks: [],
    requirementsMapped: [],
  },
  {
    id: 'ctrl-2',
    name: 'Data Protection',
    policies: [],
    tasks: [],
    requirementsMapped: [],
  },
];

// Mock React.use to return data synchronously
const originalReact = await vi.importActual<typeof import('react')>('react');
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    use: vi.fn((promise: any) => {
      // Return the fulfilled value directly
      if (promise?.status === 'fulfilled') {
        return promise.value;
      }
      // For our test promises, just return a default
      return [{ data: mockControlsData, pageCount: 1 }];
    }),
  };
});

import { ControlsTable } from './controls-table';

describe('ControlsTable', () => {
  const mockPromises = createResolvedPromise([
    { data: mockControlsData, pageCount: 1 },
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permission gating', () => {
    it('shows "Create Control" button when user has control:create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlsTable promises={mockPromises as any} />);

      const createButton = screen.getByText('Create Control');
      expect(createButton).toBeInTheDocument();
    });

    it('hides "Create Control" button when user lacks control:create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<ControlsTable promises={mockPromises as any} />);

      expect(screen.queryByText('Create Control')).not.toBeInTheDocument();
    });

    it('hides "Create Control" button when user has no permissions', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<ControlsTable promises={mockPromises as any} />);

      expect(screen.queryByText('Create Control')).not.toBeInTheDocument();
    });

    it('checks the correct resource and action for create permission', () => {
      setMockPermissions(ADMIN_PERMISSIONS);

      render(<ControlsTable promises={mockPromises as any} />);

      expect(mockHasPermission).toHaveBeenCalledWith('control', 'create');
    });
  });

  describe('Rendering with permissions', () => {
    it('renders control rows regardless of create permission', () => {
      setMockPermissions(AUDITOR_PERMISSIONS);

      render(<ControlsTable promises={mockPromises as any} />);

      expect(screen.getByText('Access Control')).toBeInTheDocument();
      expect(screen.getByText('Data Protection')).toBeInTheDocument();
    });

    it('renders search input regardless of permissions', () => {
      setMockPermissions(NO_PERMISSIONS);

      render(<ControlsTable promises={mockPromises as any} />);

      expect(screen.getByPlaceholderText('Search controls...')).toBeInTheDocument();
    });
  });
});
