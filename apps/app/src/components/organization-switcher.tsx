'use client';

import { changeOrganizationAction } from '@/actions/change-organization';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@comp/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@comp/ui/dropdown-menu';
import type { Organization } from '@db';
import { Check, ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

interface OrganizationSwitcherProps {
  organizations: Organization[];
  organization: Organization | null;
  isCollapsed?: boolean;
}

interface OrganizationInitialsAvatarProps {
  name: string | null | undefined;
  size?: 'xs' | 'sm' | 'default';
  className?: string;
}

const COLOR_PAIRS = [
  'bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-200',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-200',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-200',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/70 dark:text-purple-200',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/70 dark:text-fuchsia-200',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/70 dark:text-pink-200',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/70 dark:text-rose-200',
  'bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-200',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/70 dark:text-orange-200',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-200',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/70 dark:text-yellow-200',
  'bg-lime-100 text-lime-700 dark:bg-lime-900/70 dark:text-lime-200',
  'bg-green-100 text-green-700 dark:bg-green-900/70 dark:text-green-200',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/70 dark:text-teal-200',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/70 dark:text-cyan-200',
];

function OrganizationInitialsAvatar({
  name,
  size = 'default',
  className,
}: OrganizationInitialsAvatarProps) {
  const initials = name?.slice(0, 2).toUpperCase() || '';

  let colorIndex = 0;
  if (initials.length > 0) {
    const charCodeSum = Array.from(initials).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    colorIndex = charCodeSum % COLOR_PAIRS.length;
  }

  const selectedColorClass = COLOR_PAIRS[colorIndex] || COLOR_PAIRS[0];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xs font-medium',
        size === 'xs' ? 'size-4 text-[10px]' : size === 'sm' ? 'size-6 text-xs' : 'size-8 text-sm',
        selectedColorClass,
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function OrganizationSwitcher({
  organizations,
  organization,
  isCollapsed = false,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const sortedOrganizations = useMemo(
    () => [...organizations].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [organizations],
  );

  const { execute, status } = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
      setOpen(false);
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

  const currentOrganization = organization;

  const handleOrgChange = (org: Organization) => {
    execute({ organizationId: org.id });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  return (
    <div className="w-full">
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={isCollapsed ? 'icon' : 'default'}
            className={cn(
              'w-full rounded-xs h-7.5 hover:bg-transparent',
              isCollapsed ? 'w-7.5 p-0 justify-center' : 'px-2.5 gap-2.5 justify-start',
              status === 'executing' && 'cursor-not-allowed opacity-50',
            )}
            disabled={status === 'executing'}
          >
            <OrganizationInitialsAvatar name={currentOrganization?.name} size="xs" />
            {!isCollapsed && (
              <>
                <span className="ml-2 flex-1 truncate text-left">{currentOrganization?.name}</span>
                <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="p-0 w-(--radix-popper-anchor-width)"
        >
          <Command className="border-0">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search organization..."
                className="placeholder:text-muted-foreground flex h-10 w-full rounded-xs border-0 bg-transparent py-2.5 text-xs outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty>No results found</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {sortedOrganizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={`${org.id} ${org.name || ''}`}
                    onSelect={() => {
                      if (org.id !== currentOrganization?.id) {
                        handleOrgChange(org);
                      } else {
                        handleOpenChange(false);
                      }
                    }}
                    disabled={status === 'executing'}
                    className="flex items-center gap-1.5"
                  >
                    {status === 'executing' && pendingOrgId === org.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : currentOrganization?.id === org.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}

                    <OrganizationInitialsAvatar name={org.name} size="xs" />
                    <span className="truncate">{getDisplayName(org)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    router.push('/setup?intent=create-additional');
                    setOpen(false);
                  }}
                  disabled={status === 'executing'}
                  className="flex items-center gap-2 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Create Organization
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
