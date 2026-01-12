'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Organization } from '@db';
import { Add, Checkmark, ChevronDown } from '@carbon/icons-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface OrganizationSwitcherProps {
  organizations: Organization[];
  organization: Organization | null;
  isCollapsed?: boolean;
  logoUrls?: Record<string, string>;
}

const DOT_COLORS = [
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
];

function getOrgColor(name: string | null | undefined): string {
  if (!name) return DOT_COLORS[0];
  const charCodeSum = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DOT_COLORS[charCodeSum % DOT_COLORS.length] || DOT_COLORS[0];
}

export function OrganizationSwitcher({
  organizations,
  organization,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);

  const sortedOrganizations = [...organizations].sort((a, b) => a.name.localeCompare(b.name));

  const { execute, status } = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
      setPendingOrgId(null);
    },
    onExecute: (args) => {
      setPendingOrgId(args.input.organizationId);
    },
    onError: () => {
      setPendingOrgId(null);
    },
  });

  const orgNameCounts = organizations.reduce(
    (acc, org) => {
      if (org.name) {
        acc[org.name] = (acc[org.name] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>,
  );

  const getDisplayName = (org: Organization) => {
    if (!org.name) return `Org (${org.id.substring(0, 4)})`;
    if (orgNameCounts[org.name] > 1) {
      return `${org.name} (${org.id.substring(0, 4)})`;
    }
    return org.name;
  };

  const handleOrgChange = (org: Organization) => {
    if (org.id !== organization?.id) {
      execute({ organizationId: org.id });
    }
  };

  const isExecuting = status === 'executing';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-background/50"
        disabled={isExecuting}
      >
        {organization?.name || 'Select Organization'}
        <ChevronDown size={12} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ minWidth: '220px' }}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {sortedOrganizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleOrgChange(org)}
              disabled={isExecuting && pendingOrgId === org.id}
            >
              <div className={`size-2 rounded-full ${getOrgColor(org.name)}`} />
              <span className="flex-1">{getDisplayName(org)}</span>
              {organization?.id === org.id && (
                <Checkmark size={16} className="text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/setup?intent=create-additional')}
          disabled={isExecuting}
        >
          <Add size={16} />
          Create new organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
