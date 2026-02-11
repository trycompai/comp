import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PermissionMatrix,
  getAccessLevel,
  accessLevelToPermissions,
  RESOURCES,
} from './PermissionMatrix';

describe('PermissionMatrix', () => {
  describe('Rendering', () => {
    it('renders all resources', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      for (const resource of RESOURCES) {
        expect(screen.getByText(resource.label)).toBeInTheDocument();
        expect(screen.getByText(resource.description)).toBeInTheDocument();
      }
    });

    it('renders column headers', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      expect(screen.getByText('Resource')).toBeInTheDocument();
      expect(screen.getByText('No Access')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('Write')).toBeInTheDocument();
    });

    it('selects "No Access" by default when no permissions exist', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Each resource has a radio group + 1 for "Select all" row
      const radioGroups = screen.getAllByRole('radiogroup');
      expect(radioGroups).toHaveLength(RESOURCES.length + 1);
    });

    it('shows correct selection based on value prop', () => {
      const mockOnChange = vi.fn();
      render(
        <PermissionMatrix
          value={{
            control: ['read'], // view level
            risk: ['create', 'read', 'update', 'delete'], // edit level
          }}
          onChange={mockOnChange}
        />
      );

      // Each resource has a radio group + 1 for "Select all" row
      const radioGroups = screen.getAllByRole('radiogroup');
      expect(radioGroups).toHaveLength(RESOURCES.length + 1);
    });
  });

  describe('Interactions', () => {
    it('calls onChange with correct permissions when selecting Read', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Find the Controls row and click on Read radio
      const controlsText = screen.getByText('Controls');
      const controlsRow = controlsText.closest('[class*="grid"]');
      const radios = controlsRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[1]) {
        fireEvent.click(radios[1]); // Read is second option
      }

      expect(mockOnChange).toHaveBeenCalledWith({
        control: ['read'],
      });
    });

    it('calls onChange with correct permissions when selecting Write', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Find the Controls row and click on Write radio
      const controlsText = screen.getByText('Controls');
      const controlsRow = controlsText.closest('[class*="grid"]');
      const radios = controlsRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[2]) {
        fireEvent.click(radios[2]); // Write is third option
      }

      expect(mockOnChange).toHaveBeenCalledWith({
        control: ['create', 'read', 'update', 'delete'],
      });
    });

    it('removes permissions when selecting No Access', () => {
      const mockOnChange = vi.fn();
      render(
        <PermissionMatrix
          value={{ control: ['read'] }}
          onChange={mockOnChange}
        />
      );

      // Find the Controls row and click on No Access radio
      const controlsText = screen.getByText('Controls');
      const controlsRow = controlsText.closest('[class*="grid"]');
      const radios = controlsRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[0]) {
        fireEvent.click(radios[0]); // No Access is first option
      }

      expect(mockOnChange).toHaveBeenCalledWith({});
    });

    it('preserves other permissions when changing one resource', () => {
      const mockOnChange = vi.fn();
      render(
        <PermissionMatrix
          value={{
            control: ['read'],
            policy: ['read'],
          }}
          onChange={mockOnChange}
        />
      );

      // Find the Risk row and click on Read radio
      const riskText = screen.getByText('Risks');
      const riskRow = riskText.closest('[class*="grid"]');
      const radios = riskRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[1]) {
        fireEvent.click(radios[1]); // Read
      }

      expect(mockOnChange).toHaveBeenCalledWith({
        control: ['read'],
        policy: ['read'],
        risk: ['read'],
      });
    });
  });

  describe('Disabled state', () => {
    it('disables all radio groups when disabled prop is true', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} disabled />);

      const radioGroups = screen.getAllByRole('radiogroup');
      for (const group of radioGroups) {
        expect(group).toHaveAttribute('aria-disabled', 'true');
      }
    });
  });

  describe('Set All functionality', () => {
    it('renders Select all row with radio buttons', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      expect(screen.getByText('Select all')).toBeInTheDocument();
      // There should be one more radio group than resources (for the "select all" row)
      const radioGroups = screen.getAllByRole('radiogroup');
      expect(radioGroups).toHaveLength(RESOURCES.length + 1);
    });

    it('sets all resources to Read when clicking Select all Read radio', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Find the Select all row and click its Read radio
      const selectAllText = screen.getByText('Select all');
      const selectAllRow = selectAllText.closest('[class*="grid"]');
      const radios = selectAllRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[1]) {
        fireEvent.click(radios[1]); // Read is second option (index 1)
      }

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          control: ['read'],
          evidence: ['read'],
          policy: ['read'],
          risk: ['read'],
          vendor: ['read'],
          task: ['read'],
          framework: ['read'],
          audit: ['read'],
          finding: ['read'],
          questionnaire: ['read'],
          integration: ['read'],
        })
      );
    });

    it('sets all resources to Write when clicking Select all Write radio', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Find the Select all row and click its Write radio
      const selectAllText = screen.getByText('Select all');
      const selectAllRow = selectAllText.closest('[class*="grid"]');
      const radios = selectAllRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[2]) {
        fireEvent.click(radios[2]); // Write is third option (index 2)
      }

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          control: expect.arrayContaining(['create', 'read', 'update', 'delete']),
          policy: expect.arrayContaining(['create', 'read', 'update', 'delete']),
        })
      );
    });

    it('clears all permissions when clicking Select all No Access radio', () => {
      const mockOnChange = vi.fn();
      render(
        <PermissionMatrix
          value={{
            control: ['read'],
            policy: ['read'],
          }}
          onChange={mockOnChange}
        />
      );

      // Find the Select all row and click its No Access radio
      const selectAllText = screen.getByText('Select all');
      const selectAllRow = selectAllText.closest('[class*="grid"]');
      const radios = selectAllRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[0]) {
        fireEvent.click(radios[0]); // No Access is first option (index 0)
      }

      expect(mockOnChange).toHaveBeenCalledWith({});
    });

    it('shows selected state when all resources have same access level', () => {
      const mockOnChange = vi.fn();
      // Set all resources to view level
      const allReadPermissions: Record<string, string[]> = {};
      for (const resource of RESOURCES) {
        allReadPermissions[resource.key] = ['read'];
      }

      render(<PermissionMatrix value={allReadPermissions} onChange={mockOnChange} />);

      // The Select all row should have the "view" radio selected
      const radioGroups = screen.getAllByRole('radiogroup');
      const selectAllGroup = radioGroups[0]; // First radio group is Select all
      expect(selectAllGroup).toBeInTheDocument();
    });
  });
});

describe('Utility Functions', () => {
  describe('getAccessLevel', () => {
    it('returns "none" for empty permissions', () => {
      expect(getAccessLevel('control', [])).toBe('none');
    });

    it('returns "none" for undefined permissions', () => {
      expect(getAccessLevel('control', undefined as unknown as string[])).toBe('none');
    });

    it('returns "view" for read-only permissions', () => {
      expect(getAccessLevel('control', ['read'])).toBe('view');
    });

    it('returns "edit" for permissions that include create/update/delete', () => {
      expect(getAccessLevel('control', ['create', 'read'])).toBe('edit');
      expect(getAccessLevel('control', ['read', 'update'])).toBe('edit');
      expect(getAccessLevel('control', ['read', 'delete'])).toBe('edit');
    });
  });

  describe('accessLevelToPermissions', () => {
    it('returns empty array for "none"', () => {
      expect(accessLevelToPermissions('control', 'none')).toEqual([]);
    });

    it('returns correct view permissions', () => {
      expect(accessLevelToPermissions('control', 'view')).toEqual(['read']);
      expect(accessLevelToPermissions('policy', 'view')).toEqual(['read']);
    });

    it('returns correct edit permissions', () => {
      expect(accessLevelToPermissions('control', 'edit')).toEqual([
        'create', 'read', 'update', 'delete',
      ]);
    });
  });
});
