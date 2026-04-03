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

// Mock next/navigation
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
    }),
  };
});

// Mock nuqs
vi.mock('nuqs', () => ({
  parseAsString: {
    withDefault: () => ({
      withDefault: () => ({}),
    }),
  },
  useQueryState: (key: string, parser: any) => {
    if (key === 'title') return ['', vi.fn()];
    if (key === 'sort') return [[{ id: 'title', desc: false }], vi.fn()];
    return ['', vi.fn()];
  },
}));

// Mock parsers
vi.mock('@/lib/parsers', () => ({
  getSortingStateParser: () => ({
    withDefault: (val: any) => val,
  }),
}));

// Mock use-risks - returns null so the component falls back to initialRisks prop
const mockDeleteRisk = vi.fn();
vi.mock('@/hooks/use-risks', () => ({
  useRisks: () => ({
    data: null,
    mutate: vi.fn(),
  }),
  useRiskActions: () => ({
    deleteRisk: mockDeleteRisk,
  }),
}));

// Mock @db
vi.mock('@db', () => ({
  Risk: {},
}));

// Mock onboarding hooks
vi.mock('./hooks/use-onboarding-status', () => ({
  useOnboardingStatus: () => ({
    itemStatuses: {},
    progress: null,
    itemsInfo: [],
    isActive: false,
    isLoading: false,
  }),
}));

// Mock onboarding components
vi.mock('./components/risk-onboarding-context', () => ({
  RiskOnboardingProvider: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./components/risks-loading-animation', () => ({
  RisksLoadingAnimation: () => <div data-testid="loading-animation" />,
}));

// Mock design system components
vi.mock('@trycompai/design-system', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogAction: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  DropdownMenuTrigger: ({ children, ...props }: any) => <button data-testid="row-actions-trigger" {...props}>{children}</button>,
  Empty: ({ children }: any) => <div data-testid="empty-state">{children}</div>,
  EmptyDescription: ({ children }: any) => <p>{children}</p>,
  EmptyHeader: ({ children }: any) => <div>{children}</div>,
  EmptyTitle: ({ children }: any) => <h3>{children}</h3>,
  HStack: ({ children }: any) => <div>{children}</div>,
  InputGroup: ({ children }: any) => <div>{children}</div>,
  InputGroupAddon: ({ children }: any) => <span>{children}</span>,
  InputGroupInput: (props: any) => <input {...props} />,
  Spinner: () => <span data-testid="spinner" />,
  Stack: ({ children }: any) => <div>{children}</div>,
  Table: ({ children, pagination }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children, onClick, ...props }: any) => <tr onClick={onClick} {...props}>{children}</tr>,
  Text: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  OverflowMenuVertical: () => <span data-testid="overflow-icon" />,
  Search: () => <span data-testid="search-icon" />,
  TrashCan: () => <span data-testid="trash-icon" />,
}));

import { RisksTable } from './RisksTable';
import type { RiskRow } from './RisksTable';

const mockRisks: RiskRow[] = [
  {
    id: 'risk_1',
    title: 'Test Risk',
    description: 'A test risk',
    category: 'other' as const,
    department: null,
    status: 'open' as const,
    likelihood: 'possible' as const,
    impact: 'moderate' as const,
    residualLikelihood: 'unlikely' as const,
    residualImpact: 'minor' as const,
    treatmentStrategy: 'mitigate' as const,
    treatmentStrategyDescription: null,
    organizationId: 'org_123',
    assigneeId: null,
    assignee: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  } as any,
];

const defaultProps = {
  risks: mockRisks,
  assignees: [],
  pageCount: 1,
  orgId: 'org_123',
};

describe('RisksTable permission gating', () => {
  beforeEach(() => {
    setMockPermissions({});
    vi.clearAllMocks();
  });

  it('shows ACTIONS column header when admin has risk:delete', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RisksTable {...defaultProps} />);

    expect(screen.getByText('ACTIONS')).toBeInTheDocument();
  });

  it('hides ACTIONS column header for auditor without risk:delete', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<RisksTable {...defaultProps} />);

    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('hides ACTIONS column when user has no permissions', () => {
    setMockPermissions({});

    render(<RisksTable {...defaultProps} />);

    expect(screen.queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('renders core table columns regardless of permissions', () => {
    setMockPermissions({});

    render(<RisksTable {...defaultProps} />);

    expect(screen.getByText('RISK')).toBeInTheDocument();
    expect(screen.getByText('SEVERITY')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
    expect(screen.getByText('UPDATED')).toBeInTheDocument();
  });

  it('renders search bar regardless of permissions', () => {
    setMockPermissions({});

    render(<RisksTable {...defaultProps} />);

    expect(screen.getByPlaceholderText('Search risks...')).toBeInTheDocument();
  });

  it('shows row action menu (dropdown trigger) when admin has risk:delete', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    render(<RisksTable {...defaultProps} />);

    // The row should have a dropdown trigger for delete actions
    const triggers = screen.getAllByTestId('row-actions-trigger');
    expect(triggers.length).toBeGreaterThan(0);
  });

  it('hides row action menu for auditor without risk:delete', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    render(<RisksTable {...defaultProps} />);

    expect(screen.queryByTestId('row-actions-trigger')).not.toBeInTheDocument();
  });

  it('shows empty state when no risks exist', () => {
    setMockPermissions({});

    render(<RisksTable {...defaultProps} risks={[]} />);

    expect(screen.getByText('No risks yet')).toBeInTheDocument();
  });
});
