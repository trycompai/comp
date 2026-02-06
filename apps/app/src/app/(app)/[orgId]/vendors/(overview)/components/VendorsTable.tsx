'use client';

import { OnboardingLoadingAnimation } from '@/components/onboarding-loading-animation';
import { useApi } from '@/hooks/use-api';
import { useVendors, type Vendor } from '@/hooks/use-vendors';
import { VendorStatus } from '@/components/vendor-status';
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
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
import { OverflowMenuVertical, Search, TrashCan } from '@trycompai/design-system/icons';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useOnboardingStatus } from '../hooks/use-onboarding-status';
import { VendorOnboardingProvider, useVendorOnboardingStatus } from './vendor-onboarding-context';

export type VendorRow = Vendor & {
  isPending?: boolean;
  isAssessing?: boolean;
};

type AssigneeMember = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

const ACTIVE_STATUSES: Array<'pending' | 'processing' | 'created' | 'assessing'> = [
  'pending',
  'processing',
  'created',
  'assessing',
];

const CATEGORY_MAP: Record<string, string> = {
  cloud: 'Cloud',
  infrastructure: 'Infrastructure',
  software_as_a_service: 'SaaS',
  finance: 'Finance',
  marketing: 'Marketing',
  sales: 'Sales',
  hr: 'HR',
  other: 'Other',
};

interface VendorsTableProps {
  vendors: Vendor[];
  assignees: AssigneeMember[];
  onboardingRunId?: string | null;
  orgId: string;
}

function VendorNameCell({ vendor }: { vendor: VendorRow }) {
  const onboardingStatus = useVendorOnboardingStatus();
  const status = onboardingStatus[vendor.id];
  const isPending = vendor.isPending || status === 'pending' || status === 'processing';
  const isAssessing = vendor.isAssessing || status === 'assessing';
  const isResolved = vendor.status === 'assessed';

  if ((isPending || isAssessing) && !isResolved) {
    return (
      <HStack gap="2" align="center">
        <Spinner />
        <Text variant="muted">{vendor.name}</Text>
      </HStack>
    );
  }

  return <Text>{vendor.name}</Text>;
}

function VendorStatusCell({ vendor }: { vendor: VendorRow }) {
  const onboardingStatus = useVendorOnboardingStatus();
  const status = onboardingStatus[vendor.id];
  const isPending = vendor.isPending || status === 'pending' || status === 'processing';
  const isAssessing = vendor.isAssessing || status === 'assessing';
  const isResolved = vendor.status === 'assessed';

  if (isPending && !isResolved) {
    return (
      <HStack gap="2" align="center">
        <Spinner />
        <Text variant="muted" size="sm">
          Creating...
        </Text>
      </HStack>
    );
  }

  if (isAssessing && !isResolved) {
    return (
      <HStack gap="2" align="center">
        <Spinner />
        <Text variant="muted" size="sm">
          Assessing...
        </Text>
      </HStack>
    );
  }

  return <VendorStatus status={vendor.status} />;
}

export function VendorsTable({
  vendors: initialVendors,
  assignees,
  onboardingRunId,
  orgId,
}: VendorsTableProps) {
  const router = useRouter();
  const api = useApi();
  const { mutate: globalMutate } = useSWRConfig();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<VendorRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local state for search, sorting, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<{ id: 'name' | 'updatedAt'; desc: boolean }>({
    id: 'name',
    desc: false,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const pageSizeOptions = [10, 25, 50, 100];

  const { itemStatuses, progress, itemsInfo, isActive, isLoading } = useOnboardingStatus(
    onboardingRunId,
    'vendors',
  );

  // Use SWR hook for vendors with polling
  const { data: vendorsResponse } = useVendors({
    initialData: initialVendors,
    refreshInterval: isActive ? 1000 : 5000,
  });

  const vendors = useMemo(() => {
    const data = vendorsResponse?.data?.data;
    return Array.isArray(data) ? data : initialVendors;
  }, [vendorsResponse, initialVendors]);

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
        isSubProcessor: false,
        organizationId: orgId,
        assigneeId: null,
        assignee: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        isSubProcessor: false,
        organizationId: orgId,
        assigneeId: null,
        assignee: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPending: true,
      }));

    return [...vendorsWithStatus, ...pendingVendors, ...tempVendors];
  }, [vendors, itemsInfo, itemStatuses, orgId, isActive, onboardingRunId]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Client-side filtering and sorting
  const filteredAndSortedVendors = useMemo(() => {
    let result = [...mergedVendors];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((vendor) => vendor.name.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      const aValue = sort.id === 'name' ? a.name : a.updatedAt;
      const bValue = sort.id === 'name' ? b.name : b.updatedAt;

      if (sort.id === 'name') {
        const comparison = (aValue as string).localeCompare(bValue as string);
        return sort.desc ? -comparison : comparison;
      }
      const comparison =
        new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
      return sort.desc ? -comparison : comparison;
    });

    return result;
  }, [mergedVendors, searchQuery, sort]);

  // Calculate pageCount from filtered data and paginate
  const filteredPageCount = Math.max(
    1,
    Math.ceil(filteredAndSortedVendors.length / perPage),
  );

  const startIndex = (page - 1) * perPage;
  const paginatedVendors = filteredAndSortedVendors.slice(startIndex, startIndex + perPage);

  // Keep page in bounds when pageCount changes
  useEffect(() => {
    if (page > filteredPageCount) {
      setPage(filteredPageCount);
    }
  }, [page, filteredPageCount]);

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
    if (sort.id === columnId) {
      setSort({ id: columnId, desc: !sort.desc });
    } else {
      setSort({ id: columnId, desc: false });
    }
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
      const response = await api.delete(`/v1/vendors/${vendorToDelete.id}`);
      if (!response.error) {
        toast.success('Vendor deleted successfully');
        setDeleteDialogOpen(false);
        setVendorToDelete(null);
        globalMutate(
          (key) =>
            (Array.isArray(key) && key[0]?.includes('/v1/vendors')) ||
            (typeof key === 'string' && key.includes('/v1/vendors')),
          undefined,
          { revalidate: true },
        );
      } else {
        toast.error('Failed to delete vendor');
      }
    } catch {
      toast.error('Failed to delete vendor');
    } finally {
      setIsDeleting(false);
    }
  };

  const isEmpty = mergedVendors.length === 0;
  const showEmptyState = isEmpty && onboardingRunId && isActive;
  const emptyTitle = searchQuery ? 'No vendors found' : 'No vendors yet';
  const emptyDescription = searchQuery
    ? 'Try adjusting your search.'
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
        {/* Search Bar */}
        <div className="w-full md:max-w-[300px]">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>

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
              page,
              pageCount: filteredPageCount,
              onPageChange: setPage,
              pageSize: perPage,
              pageSizeOptions: pageSizeOptions,
              onPageSizeChange: (size) => {
                setPerPage(size);
                setPage(1);
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
