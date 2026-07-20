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

    it('renders section headers and column headers', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      expect(screen.getByText('Compliance')).toBeInTheDocument();
      expect(screen.getByText('Security')).toBeInTheDocument();
      // Column headers appear in each section
      const noAccessHeaders = screen.getAllByText('No Access');
      expect(noAccessHeaders.length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Read').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Write').length).toBeGreaterThanOrEqual(2);
    });

    it('selects "No Access" by default when no permissions exist', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Each resource has a radio group + "Select all" for sections with >1 resource
      const radioGroups = screen.getAllByRole('radiogroup');
      // Compliance section has >1 resource so gets a Select All row; Security has only 1 so doesn't
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

  describe('Select All per section', () => {
    it('renders Select All row for Compliance section', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      expect(screen.getByText('Select All')).toBeInTheDocument();
    });

    it('does not render Select All for sections with only one resource', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      // Only one Select All (for Compliance). Security has 1 resource so no Select All.
      const selectAllElements = screen.getAllByText('Select All');
      expect(selectAllElements).toHaveLength(1);
    });

    it('sets all resources in section to Read when Select All Read is clicked', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      const selectAllText = screen.getByText('Select All');
      const selectAllRow = selectAllText.closest('[class*="grid"]');
      const radios = selectAllRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[1]) {
        fireEvent.click(radios[1]); // Read is second option
      }

      const result = mockOnChange.mock.calls[0][0];
      // All compliance resources should have ['read']
      expect(result.control).toEqual(['read']);
      expect(result.policy).toEqual(['read']);
      expect(result.risk).toEqual(['read']);
      // Pentest (Security section) should NOT be affected
      expect(result.pentest).toBeUndefined();
    });

    it('sets all resources in section to Write when Select All Write is clicked', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      const selectAllText = screen.getByText('Select All');
      const selectAllRow = selectAllText.closest('[class*="grid"]');
      const radios = selectAllRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[2]) {
        fireEvent.click(radios[2]); // Write is third option
      }

      const result = mockOnChange.mock.calls[0][0];
      // All compliance resources should have full edit permissions
      expect(result.control).toEqual(expect.arrayContaining(['create', 'read', 'update', 'delete']));
      expect(result.policy).toEqual(expect.arrayContaining(['create', 'read', 'update', 'delete']));
      // Pentest should NOT be affected
      expect(result.pentest).toBeUndefined();
    });

    it('sets all resources in section to No Access when Select All No Access is clicked', () => {
      const mockOnChange = vi.fn();
      render(
        <PermissionMatrix
          value={{
            control: ['read'],
            policy: ['read'],
            pentest: ['read'],
          }}
          onChange={mockOnChange}
        />
      );

      const selectAllText = screen.getByText('Select All');
      const selectAllRow = selectAllText.closest('[class*="grid"]');
      const radios = selectAllRow?.querySelectorAll('[data-slot="radio-group-item"]');

      if (radios && radios[0]) {
        fireEvent.click(radios[0]); // No Access is first option
      }

      const result = mockOnChange.mock.calls[0][0];
      // Compliance resources should be removed
      expect(result.control).toBeUndefined();
      expect(result.policy).toBeUndefined();
      // Pentest (Security section) should be preserved
      expect(result.pentest).toEqual(['read']);
    });
  });

  describe('Section grouping', () => {
    it('renders Penetration Tests under Security section', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      expect(screen.getByText('Penetration Tests')).toBeInTheDocument();
    });

    it('includes pentest resource in RESOURCES list', () => {
      expect(RESOURCES.find((r) => r.key === 'pentest')).toBeDefined();
    });
  });

  // CS-591: the role editor exposed no toggle for the `secret` resource, so
  // admins could not grant secrets access to custom roles. Users were told to
  // use "Integrations write", which only grants `integration:*` — the Secrets
  // page then 403s on GET /v1/secrets (RequirePermission('secret','read')) and
  // renders empty. The matrix must surface a dedicated Secrets toggle.
  describe('Secrets management (CS-591)', () => {
    it('includes secret resource in RESOURCES list', () => {
      expect(RESOURCES.find((r) => r.key === 'secret')).toBeDefined();
    });

    it('renders a Secrets row in the matrix', () => {
      const mockOnChange = vi.fn();
      render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

      expect(screen.getByText('Secrets')).toBeInTheDocument();
    });

    it('maps Write to full secret CRUD including read (unblocks the Secrets page)', () => {
      // accessLevelToPermissions is exactly what handleAccessChange calls when
      // an admin picks "Write"; it must include 'read' so the assigned user
      // passes RequirePermission('secret','read') on GET /v1/secrets.
      expect(accessLevelToPermissions('secret', 'edit')).toEqual([
        'create', 'read', 'update', 'delete',
      ]);
    });

    it('maps Read (view) to secret:read', () => {
      expect(accessLevelToPermissions('secret', 'view')).toEqual(['read']);
    });
  });
});

describe('Employee Compliance obligation implies portal access', () => {
  function findComplianceSwitch(): HTMLElement {
    const label = screen.getByText('Employee Compliance');
    const row = label.closest('[class*="flex"]') as HTMLElement;
    const switchEl = row.querySelector('[role="switch"]');
    if (!switchEl) throw new Error('Employee Compliance switch not found');
    return switchEl as HTMLElement;
  }

  it('adds portal:read/update permissions when the compliance obligation is enabled', () => {
    const mockOnChange = vi.fn();
    const mockOnObligationsChange = vi.fn();
    render(
      <PermissionMatrix
        value={{ control: ['read'] }}
        onChange={mockOnChange}
        obligations={{}}
        onObligationsChange={mockOnObligationsChange}
      />,
    );

    fireEvent.click(findComplianceSwitch());

    expect(mockOnObligationsChange).toHaveBeenCalledWith({ compliance: true });
    expect(mockOnChange).toHaveBeenCalledWith({
      control: ['read'],
      portal: ['read', 'update'],
    });
  });

  it('removes portal permissions when the compliance obligation is disabled', () => {
    const mockOnChange = vi.fn();
    const mockOnObligationsChange = vi.fn();
    render(
      <PermissionMatrix
        value={{ control: ['read'], portal: ['read', 'update'] }}
        onChange={mockOnChange}
        obligations={{ compliance: true }}
        onObligationsChange={mockOnObligationsChange}
      />,
    );

    fireEvent.click(findComplianceSwitch());

    expect(mockOnObligationsChange).toHaveBeenCalledWith({});
    expect(mockOnChange).toHaveBeenCalledWith({ control: ['read'] });
  });

  it('does not inject portal permissions when an unrelated resource permission changes', () => {
    // Only the 'compliance' obligation toggle should sync portal — a plain
    // resource-permission change must not go through the obligation branch.
    const mockOnChange = vi.fn();
    render(<PermissionMatrix value={{}} onChange={mockOnChange} />);

    const controlsText = screen.getByText('Controls');
    const controlsRow = controlsText.closest('[class*="grid"]');
    const radios = controlsRow?.querySelectorAll('[data-slot="radio-group-item"]');
    if (radios && radios[1]) {
      fireEvent.click(radios[1]); // No Access -> Read: a real change
    }

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({ control: ['read'] });
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
