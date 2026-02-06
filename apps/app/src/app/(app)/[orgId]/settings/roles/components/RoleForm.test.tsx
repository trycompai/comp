import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RoleForm, type RoleFormValues, roleFormSchema } from './RoleForm';

// Mock the PermissionMatrix component since it's tested separately
vi.mock('./PermissionMatrix', () => ({
  PermissionMatrix: ({ value, onChange, disabled }: { value: Record<string, string[]>; onChange: (v: Record<string, string[]>) => void; disabled?: boolean }) => (
    <div data-testid="permission-matrix">
      <button
        type="button"
        data-testid="mock-set-permissions"
        onClick={() => onChange({ control: ['read', 'export'] })}
        disabled={disabled}
      >
        Set Permissions
      </button>
      <span data-testid="current-permissions">{JSON.stringify(value)}</span>
    </div>
  ),
}));

describe('RoleForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the form with all fields', () => {
      render(<RoleForm {...defaultProps} />);

      expect(screen.getByLabelText(/Role Name/i)).toBeInTheDocument();
      // Permissions label exists - use exact text match to avoid matching "Set Permissions" button
      expect(screen.getByText('Permissions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('renders with custom submit label', () => {
      render(<RoleForm {...defaultProps} submitLabel="Create Role" />);

      expect(screen.getByRole('button', { name: /Create Role/i })).toBeInTheDocument();
    });

    it('renders with default values', () => {
      const defaultValues: Partial<RoleFormValues> = {
        name: 'compliance-lead',
        permissions: { control: ['read', 'export'] },
      };

      render(<RoleForm {...defaultProps} defaultValues={defaultValues} />);

      expect(screen.getByDisplayValue('compliance-lead')).toBeInTheDocument();
      expect(screen.getByTestId('current-permissions')).toHaveTextContent(
        JSON.stringify({ control: ['read', 'export'] })
      );
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty name', async () => {
      render(<RoleForm {...defaultProps} />);

      // Set permissions to satisfy that validation
      fireEvent.click(screen.getByTestId('mock-set-permissions'));

      // Try to submit
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid name format', async () => {
      render(<RoleForm {...defaultProps} />);

      // Enter invalid name (starts with number)
      const nameInput = screen.getByLabelText(/Role Name/i);
      fireEvent.change(nameInput, { target: { value: '123-invalid' } });

      // Set permissions
      fireEvent.click(screen.getByTestId('mock-set-permissions'));

      // Try to submit
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Name must start with a letter and contain only letters, numbers, spaces, and hyphens/i)
        ).toBeInTheDocument();
      });
    });

    it('allows uppercase letters and spaces in name', async () => {
      const mockOnSubmit = vi.fn();
      render(<RoleForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Enter name with uppercase and spaces
      const nameInput = screen.getByLabelText(/Role Name/i);
      fireEvent.change(nameInput, { target: { value: 'Compliance Lead' } });

      // Set permissions
      fireEvent.click(screen.getByTestId('mock-set-permissions'));

      // Try to submit
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Compliance Lead',
          permissions: { control: ['read', 'export'] },
        });
      });
    });

    it('shows error when no permissions are set', async () => {
      render(<RoleForm {...defaultProps} />);

      // Enter valid name
      const nameInput = screen.getByLabelText(/Role Name/i);
      fireEvent.change(nameInput, { target: { value: 'valid-role' } });

      // Don't set any permissions

      // Try to submit
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(screen.getByText(/At least one permission must be granted/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form values when valid', async () => {
      const mockOnSubmit = vi.fn();
      render(<RoleForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Enter valid name
      const nameInput = screen.getByLabelText(/Role Name/i);
      fireEvent.change(nameInput, { target: { value: 'compliance-lead' } });

      // Set permissions
      fireEvent.click(screen.getByTestId('mock-set-permissions'));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Save/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'compliance-lead',
          permissions: { control: ['read', 'export'] },
        });
      });
    });

    it('calls onCancel when cancel button is clicked', () => {
      const mockOnCancel = vi.fn();
      render(<RoleForm {...defaultProps} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading text when isSubmitting is true', () => {
      render(<RoleForm {...defaultProps} isSubmitting />);

      expect(screen.getByRole('button', { name: /Saving.../i })).toBeInTheDocument();
    });

    it('disables form fields when isSubmitting', () => {
      render(<RoleForm {...defaultProps} isSubmitting />);

      expect(screen.getByLabelText(/Role Name/i)).toBeDisabled();
      expect(screen.getByTestId('mock-set-permissions')).toBeDisabled();
    });

    it('disables both buttons when isSubmitting', () => {
      render(<RoleForm {...defaultProps} isSubmitting />);

      expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    });
  });
});

describe('roleFormSchema', () => {
  it('validates correct role names', () => {
    // Note: name must be at least 2 characters per schema
    // Now allows uppercase, spaces, letters, numbers, and hyphens
    const validNames = [
      'compliance-lead',
      'role1',
      'ab',
      'my-role-123',
      'test',
      'Compliance Lead',
      'Risk Manager',
      'IT-Support',
    ];

    for (const name of validNames) {
      const result = roleFormSchema.safeParse({
        name,
        permissions: { control: ['read'] },
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid role names', () => {
    const invalidNames = [
      '123-starts-with-number',
      'has_underscore',
      '', // empty
      'a'.repeat(51), // too long
      ' starts-with-space',
    ];

    for (const name of invalidNames) {
      const result = roleFormSchema.safeParse({
        name,
        permissions: { control: ['read'] },
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects empty permissions', () => {
    const result = roleFormSchema.safeParse({
      name: 'valid-role',
      permissions: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects permissions with only empty arrays', () => {
    const result = roleFormSchema.safeParse({
      name: 'valid-role',
      permissions: { control: [] },
    });
    expect(result.success).toBe(false);
  });
});
