'use client';

import { OnboardingLoadingAnimation } from '@/components/onboarding-loading-animation';
import type { AssigneeOption } from '@/components/SelectAssignee';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  HStack,
  Spinner,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { OverflowMenuVertical, TrashCan } from '@trycompai/design-system/icons';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, UserIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useVendors, type Vendor as ApiVendor } from '@/hooks/use-vendors';
import { useOnboardingStatus } from '../hooks/use-onboarding-status';
import { VendorOnboardingProvider } from './vendor-onboarding-context';
import type { VendorCategory, VendorStatus as VendorStatusEnum } from '@db';
import { ACTIVE_STATUSES, CATEGORY_MAP, VENDOR_STATUS_LABELS } from './vendors-table-constants';
import { VendorsFilters } from './VendorsFilters';
import { VendorNameCell, VendorStatusCell } from './VendorCells';

export type VendorRow = Omit<ApiVendor, 'createdAt' | 'updatedAt' | 'assignee'> & {
  createdAt: Date;
  updatedAt: Date;
  assignee: AssigneeOption | null;
  isPending?: boolean;
  isAssessing?: boolean;
};

interface VendorsTableProps {
  vendors: ApiVendor[];
  assignees: AssigneeOption[];
  onboardingRunId?: string | null;
  orgId: string;
}

export function VendorsTable({
  vendors: initialVendors,
  assignees,
  onboardingRunId,
  orgId,
}: VendorsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchQuery = urlSearchParams.get('name') ?? '';
  const statusFilter = (urlSearchParams.get('status') as VendorStatusEnum | null) ?? 'all';
  const categoryFilter = (urlSearchParams.get('category') as VendorCategory | null) ?? 'all';
  const assigneeFilter = urlSearchParams.get('assigneeId') ?? 'all';
  const page = Math.max(1, Number(urlSearchParams.get('page')) || 1);
  const perPage = Math.min(100, Math.max(1, Number(urlSearchParams.get('perPage')) || 10));
  const sort = useMemo<{ id: 'name' | 'updatedAt'; desc: boolean }>(() => {
    const rawSort = urlSearchParams.get('sort');
    if (!rawSort) return { id: 'name' as const, desc: false };
    try {
      const parsed = JSON.parse(rawSort) as Array<{ id: string; desc: boolean }>;
      const first = parsed?.[0];
      if (first?.id === 'name' || first?.id === 'updatedAt') {
        return { id: first.id, desc: Boolean(first.desc) };
      }
    } catch {
      // ignore parse errors
    }
    return { id: 'name' as const, desc: false };
  }, [urlSearchParams]);
  const pageSizeOptions = [10, 25, 50, 100];

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };


  const { itemStatuses, progress, itemsInfo, isActive, isLoading } = useOnboardingStatus(
    onboardingRunId,
    'vendors',
  );

  const vendorsQuery = useMemo(
    () => ({
      page,
      perPage,
      name: searchQuery || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      assigneeId: assigneeFilter === 'all' ? undefined : assigneeFilter,
      sortId: sort.id,
      sortDesc: sort.desc,
    }),
    [page, perPage, searchQuery, statusFilter, categoryFilter, assigneeFilter, sort],
  );

  const { data: vendorsResponse, mutate: refreshVendors, deleteVendor } = useVendors({
    organizationId: orgId,
    initialData: initialVendors,
    query: vendorsQuery,
    refreshInterval: isActive ? 1000 : 5000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  const apiVendors = vendorsResponse?.data?.data ?? initialVendors;
  const totalCount = vendorsResponse?.data?.count ?? apiVendors.length;
  const pageCount =
    vendorsResponse?.data?.pageCount ??
    Math.max(1, Math.ceil(totalCount / Math.max(1, perPage)));
  const assigneeMap = useMemo(() => {
    return new Map(assignees.map((assignee) => [assignee.id, assignee]));
  }, [assignees]);
  const vendors = useMemo<VendorRow[]>(() => {
    return apiVendors.map((vendor) => ({
      ...vendor,
      createdAt: new Date(vendor.createdAt),
      updatedAt: new Date(vendor.updatedAt),
      assignee: vendor.assigneeId ? assigneeMap.get(vendor.assigneeId) ?? null : null,
    }));
  }, [apiVendors, assigneeMap]);

  // Check if all vendors are done assessing
  const allVendorsDoneAssessing = useMemo(() => {
    if (vendors.length === 0) {
      if (itemsInfo.length > 0) return false;
      return false;
    }

    if (progress && vendors.length < progress.total) {
      return false;
    }

    const hasPendingVendors = itemsInfo.some((item) => {
      const itemStatus = itemStatuses[item.id];
      return (
        (itemStatus === 'pending' ||
          itemStatus === 'processing' ||
          itemStatus === 'created' ||
          itemStatus === 'assessing') &&
        !vendors.some((v) => v.id === item.id)
      );
    });

    if (hasPendingVendors) return false;

    const allDbVendorsDone = vendors.every((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      return metadataStatus === 'completed' || vendor.status === 'assessed';
    });

    const hasAssessingVendors = Object.values(itemStatuses).some(
      (s) => s === 'assessing' || s === 'processing',
    );

    return allDbVendorsDone && !hasAssessingVendors;
  }, [vendors, itemStatuses, itemsInfo, progress]);

  // Merge DB vendors with metadata vendors (pending ones)
  const mergedVendors = useMemo<VendorRow[]>(() => {
    const dbVendorIds = new Set(vendors.map((v) => v.id));

    const vendorsWithStatus = vendors.map((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      if (vendor.status === 'not_assessed' && isActive && onboardingRunId && !metadataStatus) {
        return { ...vendor, isAssessing: true };
      }
      return vendor;
    });

    const pendingVendors: VendorRow[] = itemsInfo
      .filter((item) => {
        const itemStatus = itemStatuses[item.id];
        return (
          (itemStatus === 'pending' || itemStatus === 'processing') &&
          !dbVendorIds.has(item.id) &&
          !item.id.startsWith('temp_')
        );
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: 'Being researched and created by AI...',
        category: 'other' as const,
        status: 'not_assessed' as const,
        inherentProbability: 'very_unlikely' as const,
        inherentImpact: 'insignificant' as const,
        residualProbability: 'very_unlikely' as const,
        residualImpact: 'insignificant' as const,
        website: null,
        organizationId: orgId,
        assigneeId: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPending: true,
      }));

    const tempVendors: VendorRow[] = itemsInfo
      .filter((item) => item.id.startsWith('temp_'))
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: 'Being researched and created by AI...',
        category: 'other' as const,
        status: 'not_assessed' as const,
        inherentProbability: 'very_unlikely' as const,
        inherentImpact: 'insignificant' as const,
        residualProbability: 'very_unlikely' as const,
        residualImpact: 'insignificant' as const,
        website: null,
        organizationId: orgId,
        assigneeId: null,
        assignee: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPending: true,
      }));

    return [...vendorsWithStatus, ...pendingVendors, ...tempVendors];
  }, [vendors, itemsInfo, itemStatuses, orgId, isActive, onboardingRunId]);

  const filteredVendors = useMemo(() => {
    let result = [...mergedVendors];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((vendor) => vendor.name.toLowerCase().includes(query));
    }
    if (statusFilter !== 'all') {
      result = result.filter((vendor) => vendor.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((vendor) => vendor.category === categoryFilter);
    }
    if (assigneeFilter === 'unassigned') {
      result = result.filter((vendor) => !vendor.assigneeId);
    } else if (assigneeFilter !== 'all') {
      result = result.filter((vendor) => vendor.assigneeId === assigneeFilter);
    }
    return result;
  }, [mergedVendors, searchQuery, statusFilter, categoryFilter, assigneeFilter]);

  const paginatedVendors = filteredVendors;

  const resolvedPage = page > pageCount ? pageCount : page;

  // Calculate assessment progress
  const assessmentProgress = useMemo(() => {
    if (!progress || !itemsInfo.length) {
      return null;
    }

    const completedCount = vendors.filter((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      return metadataStatus === 'completed' || vendor.status === 'assessed';
    }).length;

    const completedInMetadata = Object.values(itemStatuses).filter((s) => s === 'completed').length;

    const total = Math.max(progress.total, itemsInfo.length, vendors.length);
    const completed = Math.max(completedCount, completedInMetadata);

    return { total, completed };
  }, [progress, itemsInfo, vendors, itemStatuses]);

  const isRowBlocked = (vendor: VendorRow) => {
    const vendorStatus = itemStatuses[vendor.id] || (vendor.isPending ? 'pending' : undefined);
    const isAssessing = vendor.isAssessing || vendorStatus === 'assessing';
    return (
      (vendorStatus &&
        ACTIVE_STATUSES.includes(
          vendorStatus as 'pending' | 'processing' | 'created' | 'assessing',
        )) ||
      isAssessing
    );
  };

  const handleRowClick = (vendorId: string) => {
    router.push(`/${orgId}/vendors/${vendorId}`);
  };

  const handleSort = (columnId: 'name' | 'updatedAt') => {
    const nextSort = sort.id === columnId ? { id: columnId, desc: !sort.desc } : { id: columnId, desc: false };
    updateParams({
      sort: JSON.stringify([nextSort]),
      page: '1',
    });
  };

  const getSortIcon = (columnId: 'name' | 'updatedAt') => {
    if (sort.id !== columnId) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return sort.desc ? (
      <ArrowDown className="ml-1 h-3 w-3" />
    ) : (
      <ArrowUp className="ml-1 h-3 w-3" />
    );
  };

  const handleDeleteClick = (vendor: VendorRow) => {
    setVendorToDelete(vendor);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;

    setIsDeleting(true);
    try {
      await deleteVendor(vendorToDelete.id);
      toast.success('Vendor deleted successfully');
      setDeleteDialogOpen(false);
      setVendorToDelete(null);
      await refreshVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const isEmpty = filteredVendors.length === 0;
  const showEmptyState = isEmpty && onboardingRunId && isActive;
  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    assigneeFilter !== 'all';
  const emptyTitle = hasActiveFilters ? 'No results' : 'No vendors yet';
  const emptyDescription = hasActiveFilters
    ? 'No results match these filters.'
    : 'Create your first vendor to get started.';

  if (showEmptyState) {
    return (
      <OnboardingLoadingAnimation
        itemType="vendors"
        title="AI is working on your vendors"
        description="Our AI is analyzing your organization and creating vendor assessments. This may take a few moments."
      />
    );
  }

  return (
    <VendorOnboardingProvider statuses={itemStatuses}>
      <Stack gap="4">
        <VendorsFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          assigneeFilter={assigneeFilter}
          assignees={assignees}
          onSearchChange={(value) =>
            updateParams({
              name: value || null,
              page: '1',
            })
          }
          onStatusChange={(value) =>
            updateParams({
              status: value || null,
              page: '1',
            })
          }
          onCategoryChange={(value) =>
            updateParams({
              category: value || null,
              page: '1',
            })
          }
          onAssigneeChange={(value) =>
            updateParams({
              assigneeId: value || null,
              page: '1',
            })
          }
        />

        {/* Onboarding Progress Banner */}
        {isActive && !allVendorsDoneAssessing && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">
                {assessmentProgress
                  ? assessmentProgress.completed === 0
                    ? 'Researching and creating vendors'
                    : 'Assessing vendors and generating risk assessments'
                  : progress
                    ? progress.completed === 0
                      ? 'Researching and creating vendors'
                      : 'Assessing vendors and generating risk assessments'
                    : 'Researching and creating vendors'}
              </span>
              <span className="text-xs text-muted-foreground">
                {assessmentProgress
                  ? assessmentProgress.completed === 0
                    ? 'AI is analyzing your organization...'
                    : `${assessmentProgress.completed}/${assessmentProgress.total} vendors assessed`
                  : progress
                    ? progress.completed === 0
                      ? 'AI is analyzing your organization...'
                      : `${progress.completed}/${progress.total} vendors created`
                    : 'AI is analyzing your organization...'}
              </span>
            </div>
          </div>
        )}

        {/* Table */}
        {isEmpty ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table
            variant="bordered"
            pagination={{
              page: resolvedPage,
              pageCount,
              onPageChange: (nextPage) => updateParams({ page: String(nextPage) }),
              pageSize: perPage,
              pageSizeOptions: pageSizeOptions,
              onPageSizeChange: (size) => {
                updateParams({
                  perPage: String(size),
                  page: '1',
                });
              },
            }}
          >
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="flex items-center hover:text-foreground"
                  >
                    NAME
                    {getSortIcon('name')}
                  </button>
                </TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>CATEGORY</TableHead>
                <TableHead>OWNER</TableHead>
                <TableHead>ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVendors.map((vendor) => {
                const blocked = isRowBlocked(vendor);
                return (
                  <TableRow
                    key={vendor.id}
                    onClick={() => !blocked && handleRowClick(vendor.id)}
                    style={{ cursor: blocked ? 'default' : 'pointer' }}
                    data-state={blocked ? 'disabled' : undefined}
                  >
                    <TableCell>
                      <VendorNameCell vendor={vendor} />
                    </TableCell>
                    <TableCell>
                      <VendorStatusCell vendor={vendor} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORY_MAP[vendor.category] || vendor.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vendor.assignee ? (
                        <HStack gap="2" align="center">
                          <Avatar size="sm">
                            <AvatarImage
                              src={vendor.assignee.user?.image || undefined}
                              alt={vendor.assignee.user?.name || ''}
                            />
                            <AvatarFallback>
                              {vendor.assignee.user?.name?.charAt(0) ||
                                vendor.assignee.user?.email?.charAt(0).toUpperCase() ||
                                '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Text size="sm">
                            {vendor.assignee.user?.name || vendor.assignee.user?.email || 'Unknown'}
                          </Text>
                        </HStack>
                      ) : (
                        <HStack gap="2" align="center">
                          <div className="bg-muted flex h-6 w-6 items-center justify-center rounded-full">
                            <UserIcon className="text-muted-foreground h-3 w-3" />
                          </div>
                          <Text size="sm" variant="muted">
                            None
                          </Text>
                        </HStack>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            variant="ellipsis"
                            disabled={blocked}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <OverflowMenuVertical />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(vendor);
                              }}
                            >
                              <TrashCan size={16} />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{vendorToDelete?.name}"? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Stack>
    </VendorOnboardingProvider>
  );
}
