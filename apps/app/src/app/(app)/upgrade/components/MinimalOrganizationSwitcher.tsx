'use client';

import { authClient } from '@/utils/auth-client';
import { Button } from '@comp/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Organization } from '@db';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface MinimalOrganizationSwitcherProps {
  organizations: Organization[];
  currentOrganization: Organization | null;
}

export function MinimalOrganizationSwitcher({
  organizations,
  currentOrganization,
}: MinimalOrganizationSwitcherProps) {
  const [isSwitching, setIsSwitching] = useState(false);

  const handleOrgChange = async (org: Organization) => {
    if (org.id !== currentOrganization?.id) {
      setIsSwitching(true);
      try {
        await authClient.organization.setActive({ organizationId: org.id });
        window.location.href = `/${org.id}/`;
      } catch {
        setIsSwitching(false);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-1 text-sm font-medium"
          disabled={isSwitching}
        >
          {currentOrganization?.name || 'Select Organization'}
          {isSwitching ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {organizations.map((org) => (
          <DropdownMenuItem key={org.id} onClick={() => handleOrgChange(org)}>
            <div className="flex items-center">
              {org.id === currentOrganization?.id && <Check className="mr-2 h-4 w-4" />}
              {org.name}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
