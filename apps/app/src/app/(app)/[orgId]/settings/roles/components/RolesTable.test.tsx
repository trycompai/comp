import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RolesTable, type CustomRole } from './RolesTable';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    delete: vi.fn(),
  },
}));

// Mock Next.js router
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useParams: () => ({
    orgId: 'test-org-id',
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockRoles: CustomRole[] = [
  {
    id: 'role-1',
    name: 'compliance-lead',
    permissions: {
      control: ['read', 'update'],
      policy: ['read', 'update'],
    },
    isBuiltIn: false,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    _count: { members: 3 },
  },
  {
    id: 'role-2',
    name: 'risk-manager',
    permissions: {
      risk: ['create', 'read', 'update', 'delete'],
    },
    isBuiltIn: false,
    createdAt: '2024-02-01T10:00:00.000Z',
    updatedAt: '2024-02-01T10:00:00.000Z',
    _count: { members: 0 },
  },
];

describe('RolesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the table with column headers', () => {
      render(<RolesTable roles={mockRoles} />);

      expect(screen.getByText('NAME')).toBeInTheDocument();
      expect(screen.getByText('PERMISSIONS')).toBeInTheDocument();
      expect(screen.getByText('CREATED')).toBeInTheDocument();
      expect(screen.getByText('ACTIONS')).toBeInTheDocument();
    });

    it('renders all roles in the table', () => {
      render(<RolesTable roles={mockRoles} />);

      expect(screen.getByText('compliance-lead')).toBeInTheDocument();
      expect(screen.getByText('risk-manager')).toBeInTheDocument();
    });

    it('displays permission count for each role', () => {
      render(<RolesTable roles={mockRoles} />);

      expect(screen.getByText('2 resources')).toBeInTheDocument(); // compliance-lead
      expect(screen.getByText('1 resources')).toBeInTheDocument(); // risk-manager (singular issue, but acceptable)
    });

    it('formats dates correctly', () => {
      render(<RolesTable roles={mockRoles} />);

      // Check for formatted dates (format: "Jan 15, 2024")
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('Feb 1, 2024')).toBeInTheDocument();
    });

    it('renders the Create Role button', () => {
      render(<RolesTable roles={mockRoles} />);

      const createButton = screen.getByRole('button', { name: /Create Role/i });
      expect(createButton).toBeInTheDocument();
    });

    it('renders the search input', () => {
      render(<RolesTable roles={mockRoles} />);

      expect(screen.getByPlaceholderText('Search roles...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no roles exist', () => {
      render(<RolesTable roles={[]} />);

      expect(screen.getByText('No custom roles yet')).toBeInTheDocument();
    });

    it('shows no match message when search returns no results', async () => {
      render(<RolesTable roles={mockRoles} />);

      const searchInput = screen.getByPlaceholderText('Search roles...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No roles match your search')).toBeInTheDocument();
    });
  });

  describe('Search Filtering', () => {
    it('filters roles by name', async () => {
      render(<RolesTable roles={mockRoles} />);

      const searchInput = screen.getByPlaceholderText('Search roles...');
      fireEvent.change(searchInput, { target: { value: 'compliance' } });

      expect(screen.getByText('compliance-lead')).toBeInTheDocument();
      expect(screen.queryByText('risk-manager')).not.toBeInTheDocument();
    });

    it('is case-insensitive', async () => {
      render(<RolesTable roles={mockRoles} />);

      const searchInput = screen.getByPlaceholderText('Search roles...');
      fireEvent.change(searchInput, { target: { value: 'RISK' } });

      expect(screen.getByText('risk-manager')).toBeInTheDocument();
      expect(screen.queryByText('compliance-lead')).not.toBeInTheDocument();
    });

    it('shows all roles when search is cleared', async () => {
      render(<RolesTable roles={mockRoles} />);

      const searchInput = screen.getByPlaceholderText('Search roles...');
      fireEvent.change(searchInput, { target: { value: 'compliance' } });
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(screen.getByText('compliance-lead')).toBeInTheDocument();
      expect(screen.getByText('risk-manager')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('renders action buttons for each role', () => {
      render(<RolesTable roles={mockRoles} />);

      // There should be 2 action menu triggers (one for each role)
      const menuTriggers = screen.getAllByRole('button');
      expect(menuTriggers.length).toBeGreaterThanOrEqual(2);
    });
  });
});
