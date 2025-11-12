'use client';

import type { Role } from '@db';
import * as React from 'react';

import { Dialog, DialogContent } from '@comp/ui/dialog';
import { MultiRoleComboboxContent } from './MultiRoleComboboxContent';
import { MultiRoleComboboxTrigger } from './MultiRoleComboboxTrigger';

// Define the selectable roles explicitly (exclude owner)
const selectableRoles: {
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

interface MultiRoleComboboxProps {
  selectedRoles: Role[];
  onSelectedRolesChange: (roles: Role[]) => void;
  placeholder?: string;
  disabled?: boolean;
  lockedRoles?: Role[]; // Roles that cannot be deselected
}

export function MultiRoleCombobox({
  selectedRoles: inputSelectedRoles,
  onSelectedRolesChange,
  placeholder,
  disabled = false,
  lockedRoles = [],
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

  // Filter out owner role for non-owners
  const availableRoles = React.useMemo(() => {
    return selectableRoles.filter((role) => role.value !== 'owner' || isOwner);
  }, [isOwner]);

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

  const filteredRoles = availableRoles.filter((role) => {
    const label = getRoleLabel(role.value);
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <MultiRoleComboboxTrigger
        selectedRoles={selectedRoles}
        lockedRoles={lockedRoles}
        triggerText={triggerText}
        disabled={disabled}
        handleSelect={handleSelect} // For badge clicks
        getRoleLabel={getRoleLabel}
        onClick={() => setOpen(true)}
        ariaExpanded={open}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0">
          <MultiRoleComboboxContent
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredRoles={filteredRoles}
            handleSelect={handleSelect} // For item selection
            lockedRoles={lockedRoles}
            selectedRoles={selectedRoles}
            onCloseDialog={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
