'use client';

import type { Role } from '@db';
import * as React from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { MultiRoleComboboxContent } from './MultiRoleComboboxContent';
import { MultiRoleComboboxTrigger } from './MultiRoleComboboxTrigger';

// Define the selectable built-in roles
const builtInRoles: {
  value: Role;
  labelKey: string;
  descriptionKey: string;
}[] = [
  {
    value: 'owner',
    labelKey: 'people.roles.owner',
    descriptionKey: 'people.roles.owner_description',
  },
  {
    value: 'admin',
    labelKey: 'people.roles.admin',
    descriptionKey: 'people.roles.admin_description',
  },
  {
    value: 'employee',
    labelKey: 'people.roles.employee',
    descriptionKey: 'people.roles.employee_description',
  },
  {
    value: 'contractor',
    labelKey: 'people.roles.contractor',
    descriptionKey: 'people.roles.contractor_description',
  },
  {
    value: 'auditor',
    labelKey: 'people.roles.auditor',
    descriptionKey: 'people.roles.auditor_description',
  },
];

// Re-export for backwards compatibility
const selectableRoles = builtInRoles;

/**
 * Custom role definition from the API
 */
export interface CustomRoleOption {
  id: string;
  name: string;
  permissions: Record<string, string[]>;
}

interface MultiRoleComboboxProps {
  selectedRoles: Role[];
  onSelectedRolesChange: (roles: Role[]) => void;
  placeholder?: string;
  disabled?: boolean;
  lockedRoles?: Role[]; // Roles that cannot be deselected
  allowedRoles?: Role[];
  customRoles?: CustomRoleOption[]; // Custom roles from the organization
}

export function MultiRoleCombobox({
  selectedRoles: inputSelectedRoles,
  onSelectedRolesChange,
  placeholder,
  disabled = false,
  lockedRoles = [],
  allowedRoles,
  customRoles = [],
}: MultiRoleComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Process selected roles to handle comma-separated values
  const selectedRoles = React.useMemo(() => {
    return inputSelectedRoles.flatMap((role) =>
      typeof role === 'string' && role.includes(',') ? (role.split(',') as Role[]) : [role],
    );
  }, [inputSelectedRoles]);

  const isOwner = selectedRoles.includes('owner');

  const normalizedAllowedRoles = React.useMemo(() => {
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles;
    }
    return selectableRoles.map((role) => role.value);
  }, [allowedRoles]);

  // Filter out owner role for non-owners
  const availableBuiltInRoles = React.useMemo(() => {
    return selectableRoles.filter(
      (role) =>
        normalizedAllowedRoles.includes(role.value) && (role.value !== 'owner' || isOwner),
    );
  }, [isOwner, normalizedAllowedRoles]);

  const handleSelect = (roleValue: Role) => {
    // Never allow owner role to be changed
    if (roleValue === 'owner') {
      return;
    }

    // If the role is locked, don't allow deselection
    if (lockedRoles.includes(roleValue) && selectedRoles.includes(roleValue)) {
      return; // Don't allow deselection of locked roles
    }

    // Allow removal of any non-locked role, even if it's the last one
    const newSelectedRoles = selectedRoles.includes(roleValue)
      ? selectedRoles.filter((r) => r !== roleValue)
      : [...selectedRoles, roleValue];
    onSelectedRolesChange(newSelectedRoles);
  };

  const getRoleLabel = (roleValue: Role) => {
    // Check if it's a custom role
    const customRole = customRoles.find((r) => r.name === roleValue);
    if (customRole) {
      return customRole.name;
    }

    // Built-in roles
    switch (roleValue) {
      case 'owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'auditor':
        return 'Auditor';
      case 'employee':
        return 'Employee';
      case 'contractor':
        return 'Contractor';
      default:
        return roleValue;
    }
  };

  const triggerText =
    selectedRoles.length > 0 ? `${selectedRoles.length} selected` : placeholder || 'Select role(s)';

  const filteredBuiltInRoles = availableBuiltInRoles.filter((role) => {
    const label = getRoleLabel(role.value);
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredCustomRoles = customRoles.filter((role) => {
    return role.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <MultiRoleComboboxTrigger
            selectedRoles={selectedRoles}
            lockedRoles={lockedRoles}
            triggerText={triggerText}
            disabled={disabled}
            handleSelect={handleSelect}
            getRoleLabel={getRoleLabel}
            ariaExpanded={open}
            customRoles={customRoles}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <MultiRoleComboboxContent
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredRoles={filteredBuiltInRoles}
          filteredCustomRoles={filteredCustomRoles}
          handleSelect={handleSelect}
          lockedRoles={lockedRoles}
          selectedRoles={selectedRoles}
          onCloseDialog={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
