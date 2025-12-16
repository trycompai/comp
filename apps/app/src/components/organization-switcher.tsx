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
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@comp/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { Organization } from '@db';
import { Check, ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';

interface OrganizationSwitcherProps {
  organizations: Organization[];
  organization: Organization | null;
  isCollapsed?: boolean;
  logoUrls?: Record<string, string>;
}

interface OrganizationAvatarProps {
  name: string | null | undefined;
  logoUrl?: string | null;
  size?: 'sm' | 'default';
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

function OrganizationAvatar({
  name,
  logoUrl,
  size = 'default',
  className,
}: OrganizationAvatarProps) {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';

  // If logo URL exists, show the image
  if (logoUrl) {
    return (
      <div className={cn('relative overflow-hidden rounded-sm border', sizeClass, className)}>
        <Image src={logoUrl} alt={name || 'Organization'} fill className="object-contain" />
      </div>
    );
  }

  // Fallback to initials
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
        'flex items-center justify-center rounded-sm font-medium',
        sizeClass,
        size === 'sm' ? 'text-xs' : 'text-sm',
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
  logoUrls = {},
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('alphabetical');

  useEffect(() => {
    const savedSortOrder = localStorage.getItem('org-sort-order');
    if (savedSortOrder) {
      setSortOrder(savedSortOrder);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('org-sort-order', sortOrder);
  }, [sortOrder]);

  const sortedOrganizations = [...organizations].sort((a, b) => {
    if (sortOrder === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else if (sortOrder === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  const [showOrganizationSwitcher, setShowOrganizationSwitcher] = useQueryState(
    'showOrganizationSwitcher',
    {
      history: 'push',
      parse: (value) => value === 'true',
      serialize: (value) => value.toString(),
    },
  );

  const { execute, status } = useAction(changeOrganizationAction, {
    onSuccess: (result) => {
      const orgId = result.data?.data?.id;
      if (orgId) {
        router.push(`/${orgId}/`);
      }
      setIsDialogOpen(false);
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

  const handleOpenChange = (open: boolean) => {
    setShowOrganizationSwitcher(open);
    setIsDialogOpen(open);
  };

  return (
    <div className="w-full">
      <Dialog open={showOrganizationSwitcher ?? isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size={isCollapsed ? 'icon' : 'default'}
            className={cn(
              'w-full',
              isCollapsed ? 'justify-center' : 'h-10 justify-start p-1 pr-2',
              status === 'executing' && 'cursor-not-allowed opacity-50',
            )}
            disabled={status === 'executing'}
          >
            <OrganizationAvatar
              name={currentOrganization?.name}
              logoUrl={currentOrganization?.id ? logoUrls[currentOrganization.id] : undefined}
            />
            {!isCollapsed && (
              <>
                <span className="ml-2 flex-1 truncate text-left">{currentOrganization?.name}</span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="p-0 sm:max-w-[400px]">
          <DialogTitle className="sr-only">Select Organization</DialogTitle>
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Search organization..."
                className="placeholder:text-muted-foreground flex h-11 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-hidden focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="p-2">
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="recent">Recently Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CommandList>
              <CommandEmpty>No results found</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {sortedOrganizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    // Search by id and name
                    value={`${org.id} ${org.name || ''}`}
                    onSelect={() => {
                      if (org.id !== currentOrganization?.id) {
                        handleOrgChange(org);
                      } else {
                        handleOpenChange(false);
                      }
                    }}
                    disabled={status === 'executing'}
                    className="flex items-center gap-2"
                  >
                    {status === 'executing' && pendingOrgId === org.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : currentOrganization?.id === org.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    <OrganizationAvatar name={org.name} logoUrl={logoUrls[org.id]} size="sm" />
                    <span className="truncate">{getDisplayName(org)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    router.push('/setup?intent=create-additional');
                    setIsDialogOpen(false);
                  }}
                  disabled={status === 'executing'}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Organization
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </div>
  );
}
