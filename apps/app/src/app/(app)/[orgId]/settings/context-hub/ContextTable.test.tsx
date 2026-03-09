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

const mockUpdateEntry = vi.fn();
const mockDeleteEntry = vi.fn();

vi.mock('./hooks/useContextEntries', () => ({
  useContextEntries: (options?: { initialData?: unknown[] }) => ({
    entries: options?.initialData ?? [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createEntry: vi.fn(),
    updateEntry: mockUpdateEntry,
    deleteEntry: mockDeleteEntry,
  }),
}));

vi.mock('@comp/ui/hooks', () => ({
  useMediaQuery: vi.fn(() => true),
}));

vi.mock('@/lib/utils', () => ({
  isJSON: (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },
}));

vi.mock('./components/context-form', () => ({
  ContextForm: () => <div data-testid="context-form" />,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('lucide-react', () => ({
  Check: () => <span data-testid="check-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

vi.mock('@trycompai/design-system', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  Button: ({ children, disabled, onClick, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Drawer: ({ children }: any) => <div>{children}</div>,
  DrawerContent: ({ children }: any) => <div>{children}</div>,
  DrawerDescription: ({ children }: any) => <p>{children}</p>,
  DrawerHeader: ({ children }: any) => <div>{children}</div>,
  DrawerTitle: ({ children }: any) => <h2>{children}</h2>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => <button data-testid="dropdown-trigger">{children}</button>,
  HStack: ({ children }: any) => <div>{children}</div>,
  InputGroup: ({ children }: any) => <div>{children}</div>,
  InputGroupAddon: ({ children }: any) => <div>{children}</div>,
  InputGroupInput: (props: any) => <input {...props} />,
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetBody: ({ children }: any) => <div>{children}</div>,
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  Stack: ({ children }: any) => <div>{children}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: any) => <td colSpan={colSpan}>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
  Close: () => <span data-testid="close-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  OverflowMenuVertical: () => <span data-testid="overflow-icon" />,
  Search: () => <span data-testid="search-icon" />,
  TrashCan: () => <span data-testid="trash-icon" />,
}));

import { ContextTable } from './ContextTable';

const sampleEntries = [
  {
    id: 'ctx-1',
    question: 'What is the company name?',
    answer: 'Acme Corp',
    organizationId: 'org-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

describe('ContextTable permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Add Entry button and actions column when user has evidence:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ContextTable entries={sampleEntries as any} pageCount={1} />);

    expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    expect(screen.getByText('ACTIONS')).toBeInTheDocument();
  });

  it('hides Add Entry button and actions column when user lacks evidence:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ContextTable entries={sampleEntries as any} pageCount={1} />);

    expect(screen.queryByRole('button', { name: /add entry/i })).not.toBeInTheDocument();
    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('hides Add Entry button and actions column when user has no permissions', () => {
    setMockPermissions({});
    render(<ContextTable entries={sampleEntries as any} pageCount={1} />);

    expect(screen.queryByRole('button', { name: /add entry/i })).not.toBeInTheDocument();
    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('displays entry data regardless of permissions', () => {
    setMockPermissions({});
    render(<ContextTable entries={sampleEntries as any} pageCount={1} />);

    expect(screen.getByText('What is the company name?')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders dropdown triggers for each entry when user has evidence:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ContextTable entries={sampleEntries as any} pageCount={1} />);

    const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
    expect(dropdownTriggers.length).toBeGreaterThan(0);
  });

  it('does not render dropdown triggers when user lacks evidence:update permission', () => {
    setMockPermissions({});
    render(<ContextTable entries={sampleEntries as any} pageCount={1} />);

    expect(screen.queryByTestId('dropdown-trigger')).not.toBeInTheDocument();
  });
});
