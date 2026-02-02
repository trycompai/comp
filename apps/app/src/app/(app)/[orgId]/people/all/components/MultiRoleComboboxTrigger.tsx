'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import type { Role } from '@db'; // Assuming Role is from prisma
import { ChevronsUpDown, Lock, X } from 'lucide-react';
import type { CustomRoleOption } from './MultiRoleCombobox';

interface MultiRoleComboboxTriggerProps {
  selectedRoles: Role[];
  lockedRoles: Role[];
  triggerText: string;
  disabled?: boolean;
  handleSelect: (role: Role) => void; // For badge click to deselect/select
  getRoleLabel: (role: Role) => string;
  onClick?: () => void;
  ariaExpanded?: boolean;
  customRoles?: CustomRoleOption[]; // Custom roles from the organization
}

export function MultiRoleComboboxTrigger({
  selectedRoles,
  lockedRoles,
  triggerText,
  disabled,
  handleSelect,
  getRoleLabel,
  onClick,
  ariaExpanded,
  customRoles = [],
}: MultiRoleComboboxTriggerProps) {
  // Check if a role is a custom role (not a built-in one)
  const isCustomRole = (role: Role): boolean => {
    const builtInRoles = ['owner', 'admin', 'auditor', 'employee', 'contractor'];
    return !builtInRoles.includes(role);
  };
  return (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={ariaExpanded}
      className="h-auto min-h-[40px] w-full justify-between shadow-none"
      disabled={disabled}
      onClick={onClick}
    >
      <div className="flex flex-wrap items-center gap-1">
        {selectedRoles.length === 0 && (
          <span className="text-muted-foreground text-sm">{triggerText}</span>
        )}
        {selectedRoles.map((role) => (
          <Badge
            key={role}
            variant={isCustomRole(role) ? 'outline' : 'secondary'}
            className={cn(
              'text-xs',
              lockedRoles.includes(role) && 'border-primary border',
              isCustomRole(role) && 'border-blue-300 bg-blue-50 text-blue-700',
            )}
            onClick={(e) => {
              e.stopPropagation(); // Prevent popover from closing if it's open
              handleSelect(role);
            }}
          >
            {getRoleLabel(role)}
            {!lockedRoles.includes(role) ? (
              <X className="ml-1 h-3 w-3 cursor-pointer" />
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="text-primary ml-1 h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{'The owner role cannot be removed.'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Badge>
        ))}
      </div>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );
}
