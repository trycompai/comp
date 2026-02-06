'use client';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@comp/ui/command';
import type { Role } from '@db'; // Assuming Role is from prisma
import { Check } from 'lucide-react';

import { cn } from '@comp/ui/cn';
import type { CustomRoleOption } from './MultiRoleCombobox';

interface MultiRoleComboboxContentProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filteredRoles: Array<{ value: Role }>; // Role objects, labels derived via t()
  filteredCustomRoles?: CustomRoleOption[]; // Custom roles from the organization
  handleSelect: (roleValue: Role) => void;
  lockedRoles: Role[];
  selectedRoles: Role[];
  onCloseDialog: () => void;
}

export function MultiRoleComboboxContent({
  searchTerm,
  setSearchTerm,
  filteredRoles,
  filteredCustomRoles = [],
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

  const getCustomRoleDescription = (permissions: Record<string, string[]>) => {
    const resourceCount = Object.keys(permissions).length;
    if (resourceCount === 0) return 'No permissions configured';
    return `Access to ${resourceCount} resource${resourceCount === 1 ? '' : 's'}`;
  };

  const hasResults = filteredRoles.length > 0 || filteredCustomRoles.length > 0;

  return (
    <Command>
      <CommandInput placeholder="Search..." value={searchTerm} onValueChange={setSearchTerm} />
      <CommandList>
        {!hasResults && <CommandEmpty>{'No results found'}</CommandEmpty>}
        {filteredRoles.length > 0 && (
          <CommandGroup heading="Built-in Roles">
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
        )}
        {filteredCustomRoles.length > 0 && (
          <>
            {filteredRoles.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Custom Roles">
              {filteredCustomRoles.map((customRole) => {
                const roleValue = customRole.name as Role;
                const isSelected = selectedRoles.includes(roleValue);
                const isLocked = lockedRoles.includes(roleValue) && isSelected;

                return (
                  <CommandItem
                    key={customRole.id}
                    value={customRole.name}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                    onSelect={() => {
                      handleSelect(roleValue);
                      onCloseDialog();
                    }}
                    disabled={isLocked}
                    className={cn(
                      'flex cursor-pointer flex-col items-start py-2',
                      isLocked && 'bg-muted/50 text-muted-foreground',
                    )}
                  >
                    <div className="flex w-full items-center">
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="flex-grow">{customRole.name}</span>
                      {isLocked && (
                        <span className="text-muted-foreground ml-auto shrink-0 pl-2 text-xs">
                          (Locked)
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-1 ml-6 text-xs">
                      {getCustomRoleDescription(customRole.permissions)}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
