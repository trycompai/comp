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

vi.mock('@/hooks/use-trust-portal-custom-links', () => ({
  useTrustPortalCustomLinks: () => ({
    createLink: vi.fn(),
    updateLink: vi.fn(),
    deleteLink: vi.fn(),
    reorderLinks: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock @dnd-kit modules
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

// Mock design system
vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, onClick, iconLeft, ...props }: any) => (
    <button onClick={onClick} {...props}>{iconLeft}{children}</button>
  ),
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => <button>{children}</button>,
  Input: (props: any) => <input {...props} />,
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Add: () => <span data-testid="add-icon" />,
  Close: () => <span data-testid="close-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Link: () => <span data-testid="link-icon" />,
  OverflowMenuVertical: () => <span data-testid="overflow-icon" />,
  TrashCan: () => <span data-testid="trash-icon" />,
}));

vi.mock('lucide-react', () => ({
  GripVertical: () => <span data-testid="grip-icon" />,
}));

import { TrustPortalCustomLinks } from './TrustPortalCustomLinks';

const mockLinks = [
  {
    id: 'link-1',
    title: 'Status Page',
    description: 'System status',
    url: 'https://status.example.com',
    order: 0,
    isActive: true,
  },
  {
    id: 'link-2',
    title: 'Support Portal',
    description: null,
    url: 'https://support.example.com',
    order: 1,
    isActive: true,
  },
];

describe('TrustPortalCustomLinks permission gating', () => {
  const defaultProps = {
    initialLinks: mockLinks,
    orgId: 'org-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section title regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalCustomLinks {...defaultProps} />);
    expect(screen.getByText('Custom Links')).toBeInTheDocument();
  });

  it('renders existing links regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalCustomLinks {...defaultProps} />);
    expect(screen.getByText('Status Page')).toBeInTheDocument();
    expect(screen.getByText('Support Portal')).toBeInTheDocument();
  });

  it('shows Add Link button when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalCustomLinks {...defaultProps} />);
    expect(screen.getByText('Add Link')).toBeInTheDocument();
  });

  it('hides Add Link button when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalCustomLinks {...defaultProps} />);
    // The "Add Link" button text should not be in a direct button context
    const addButtons = screen.queryAllByText('Add Link');
    // When no permission, the button wrapping "Add Link" should not exist
    expect(addButtons.length).toBe(0);
  });

  it('hides Add Link button when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustPortalCustomLinks {...defaultProps} />);
    const addButtons = screen.queryAllByText('Add Link');
    expect(addButtons.length).toBe(0);
  });

  it('shows edit/delete dropdown for links when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalCustomLinks {...defaultProps} />);
    // Dropdown menus should be present for each link
    const overflowIcons = screen.getAllByTestId('overflow-icon');
    expect(overflowIcons.length).toBe(2);
  });

  it('hides edit/delete dropdown for links when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalCustomLinks {...defaultProps} />);
    const overflowIcons = screen.queryAllByTestId('overflow-icon');
    expect(overflowIcons.length).toBe(0);
  });
});
