'use client';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@comp/ui/command';
import type { Role } from '@db'; // Assuming Role is from prisma
import { Check } from 'lucide-react';

import { cn } from '@comp/ui/cn';

interface MultiRoleComboboxContentProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filteredRoles: Array<{ value: Role }>; // Role objects, labels derived via t()
  handleSelect: (roleValue: Role) => void;
  lockedRoles: Role[];
  selectedRoles: Role[];
  onCloseDialog: () => void;
}

export function MultiRoleComboboxContent({
  searchTerm,
  setSearchTerm,
  filteredRoles,
  handleSelect,
  lockedRoles,
  selectedRoles,
  onCloseDialog,
}: MultiRoleComboboxContentProps) {
  const getRoleDisplayLabel = (roleValue: Role) => {
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

  const getRoleDescription = (roleValue: Role) => {
    switch (roleValue) {
      case 'owner':
        return 'Can manage users, policies, tasks, and settings, and delete organization.';
      case 'admin':
        return 'Can manage users, policies, tasks, and settings.';
      case 'auditor':
        return 'Read-only access for compliance checks.';
      case 'employee':
        return 'Can sign policies and complete training.';
      case 'contractor':
        return 'Can sign policies and complete training.';
      default:
        return '';
    }
  };

  return (
    <Command>
      <CommandInput placeholder="Search..." value={searchTerm} onValueChange={setSearchTerm} />
      <CommandList>
        <CommandEmpty>{'No results found'}</CommandEmpty>
        <CommandGroup>
          {filteredRoles.map((role) => (
            <CommandItem
              key={role.value}
              value={getRoleDisplayLabel(role.value)} // Use translated label for search/value
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
              onSelect={() => {
                handleSelect(role.value);
                onCloseDialog();
              }}
              disabled={
                role.value === 'owner' || // Always disable the owner role
                (lockedRoles.includes(role.value) && selectedRoles.includes(role.value)) // Disable any locked roles
              }
              className={cn(
                'flex cursor-pointer flex-col items-start py-2',
                lockedRoles.includes(role.value) &&
                  selectedRoles.includes(role.value) &&
                  'bg-muted/50 text-muted-foreground',
              )}
            >
              <div className="flex w-full items-center">
                <Check
                  className={cn(
                    'mr-2 h-4 w-4 shrink-0',
                    selectedRoles.includes(role.value) ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className="flex-grow">{getRoleDisplayLabel(role.value)}</span>
                {lockedRoles.includes(role.value) && selectedRoles.includes(role.value) && (
                  <span className="text-muted-foreground ml-auto shrink-0 pl-2 text-xs">
                    (Locked)
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-1 ml-6 text-xs">
                {getRoleDescription(role.value)}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
