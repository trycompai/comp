'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { OnboardingLoadingAnimation } from '@/components/onboarding-loading-animation';
import { useDataTable } from '@/hooks/use-data-table';
import { getFiltersStateParser, getSortingStateParser } from '@/lib/parsers';
import { Departments, Vendor } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { CreateVendorSheet } from '../../components/create-vendor-sheet';
import { getVendorsAction, type GetVendorsActionInput } from '../actions/get-vendors-action';
import type { GetAssigneesResult, GetVendorsResult } from '../data/queries';
import type { GetVendorsSchema } from '../data/validations';
import { useOnboardingStatus } from '../hooks/use-onboarding-status';
import { VendorOnboardingProvider } from './vendor-onboarding-context';
import { columns as getColumns } from './VendorColumns';

export type VendorRow = GetVendorsResult['data'][number] & {
  isPending?: boolean;
  isAssessing?: boolean;
};

const callGetVendorsAction = getVendorsAction as unknown as (
  input: GetVendorsActionInput,
) => Promise<GetVendorsResult>;

const ACTIVE_STATUSES: Array<'pending' | 'processing' | 'created' | 'assessing'> = [
  'pending',
  'processing',
  'created',
  'assessing',
];

interface VendorsTableProps {
  vendors: GetVendorsResult['data'];
  pageCount: number;
  assignees: GetAssigneesResult;
  onboardingRunId?: string | null;
  searchParams: GetVendorsSchema;
  orgId: string;
}

export function VendorsTable({
  vendors: initialVendors,
  pageCount: initialPageCount,
  assignees,
  onboardingRunId,
  searchParams: initialSearchParams,
  orgId,
}: VendorsTableProps) {
  const { itemStatuses, progress, itemsInfo, isActive, isLoading } = useOnboardingStatus(
    onboardingRunId,
    'vendors',
  );

  // Read current search params from URL (synced with table state via useDataTable)
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [perPage] = useQueryState('perPage', parseAsInteger.withDefault(50));
  const [name] = useQueryState('name', parseAsString.withDefault(''));
  const [status] = useQueryState(
    'status',
    parseAsStringEnum(['not_assessed', 'assessed'] as const),
  );
  const [department] = useQueryState(
    'department',
    parseAsStringEnum<Departments>(Object.values(Departments)),
  );
  const [assigneeId] = useQueryState('assigneeId', parseAsString);
  const [sort] = useQueryState(
    'sort',
    getSortingStateParser<Vendor>().withDefault([{ id: 'name', desc: false }]),
  );
  const [filters] = useQueryState('filters', getFiltersStateParser().withDefault([]));
  const [joinOperator] = useQueryState(
    'joinOperator',
    parseAsStringEnum(['and', 'or']).withDefault('and'),
  );

  // Build current search params from URL state
  const currentSearchParams = useMemo<GetVendorsSchema>(() => {
    return {
      page,
      perPage,
      name,
      status: status ?? null,
      department: department ?? null,
      assigneeId: assigneeId ?? null,
      sort,
      filters,
      joinOperator,
    };
  }, [page, perPage, name, status, department, assigneeId, sort, filters, joinOperator]);

  // Create stable SWR key from current search params
  const swrKey = useMemo(() => {
    if (!orgId) return null;
    // Serialize search params to create a stable key
    const key = JSON.stringify(currentSearchParams);
    return ['vendors', orgId, key] as const;
  }, [orgId, currentSearchParams]);

  // Fetcher function for SWR
  const fetcher = useCallback(async () => {
    if (!orgId) return { data: [], pageCount: 0 };
    return await callGetVendorsAction({ orgId, searchParams: currentSearchParams });
  }, [orgId, currentSearchParams]);

  // Use SWR to fetch vendors with polling when onboarding is active
  const { data: vendorsData } = useSWR(swrKey, fetcher, {
    fallbackData: { data: initialVendors, pageCount: initialPageCount },
    refreshInterval: isActive ? 1000 : 0, // Poll every 1 second when onboarding is active
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  const vendors = vendorsData?.data || initialVendors;
  const pageCount = vendorsData?.pageCount ?? initialPageCount;

  // Check if all vendors are done assessing
  const allVendorsDoneAssessing = useMemo(() => {
    // If no vendors exist yet, we're not done
    if (vendors.length === 0) {
      // But check if there are vendors in metadata that should exist
      if (itemsInfo.length > 0) return false;
      return false;
    }

    // Check if we're still creating vendors by comparing DB count with expected total
    // If progress.total exists and vendors.length < progress.total, we're still creating
    if (progress && vendors.length < progress.total) {
      return false;
    }

    // If there are pending/processing vendors in metadata that aren't in DB yet, we're not done
    const hasPendingVendors = itemsInfo.some((item) => {
      const status = itemStatuses[item.id];
      return (
        (status === 'pending' ||
          status === 'processing' ||
          status === 'created' ||
          status === 'assessing') &&
        !vendors.some((v) => v.id === item.id)
      );
    });

    if (hasPendingVendors) return false;

    // Check if all vendors in DB are either:
    // 1. Completed in metadata (status === 'completed')
    // 2. Assessed in database (status === 'assessed')
    const allDbVendorsDone = vendors.every((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      return metadataStatus === 'completed' || vendor.status === 'assessed';
    });

    // Also check if there are any vendors in metadata that are still assessing
    const hasAssessingVendors = Object.values(itemStatuses).some(
      (status) => status === 'assessing' || status === 'processing',
    );

    return allDbVendorsDone && !hasAssessingVendors;
  }, [vendors, itemStatuses, itemsInfo, progress]);

  // Merge DB vendors with metadata vendors (pending ones)
  const mergedVendors = useMemo<VendorRow[]>(() => {
    const dbVendorIds = new Set(vendors.map((v) => v.id));

    // Mark vendors in DB as "assessing" if they're not_assessed and onboarding is active
    // Don't mark as assessing if vendor is already assessed (resolved)
    const vendorsWithStatus = vendors.map((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      // If vendor exists in DB but status is not_assessed and onboarding is active, it's being assessed
      // Only mark as assessing if status is not_assessed (not assessed)
      if (vendor.status === 'not_assessed' && isActive && onboardingRunId && !metadataStatus) {
        return { ...vendor, isAssessing: true };
      }
      return vendor;
    });

    const pendingVendors: VendorRow[] = itemsInfo
      .filter((item) => {
        // Only show items that are pending/processing and not yet in DB
        const status = itemStatuses[item.id];
        return (
          (status === 'pending' || status === 'processing') &&
          !dbVendorIds.has(item.id) &&
          !item.id.startsWith('temp_')
        );
      })
      .map((item) => {
        // Create a placeholder vendor row for pending items
        const status = itemStatuses[item.id];
        return {
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
        } as VendorRow;
      });

    // Also handle temp IDs (vendors being created)
    const tempVendors: VendorRow[] = itemsInfo
      .filter((item) => item.id.startsWith('temp_'))
      .map((item) => {
        const status = itemStatuses[item.id];
        return {
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
        } as VendorRow;
      });

    return [...vendorsWithStatus, ...pendingVendors, ...tempVendors];
  }, [vendors, itemsInfo, itemStatuses, orgId, isActive, onboardingRunId]);

  const columns = useMemo<ColumnDef<VendorRow>[]>(() => getColumns(orgId), [orgId]);

  const { table } = useDataTable({
    data: mergedVendors,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageSize: 50,
        pageIndex: 0,
      },
      sorting: [{ id: 'name', desc: false }],
      columnPinning: { right: ['delete-vendor'] },
    },
    shallow: false,
    clearOnDefault: true,
  });

  const getRowProps = useMemo(
    () => (vendor: VendorRow) => {
      const status = itemStatuses[vendor.id] || (vendor.isPending ? 'pending' : undefined);
      const isAssessing = vendor.isAssessing || status === 'assessing';
      const isBlocked =
        (status &&
          ACTIVE_STATUSES.includes(status as 'pending' | 'processing' | 'created' | 'assessing')) ||
        isAssessing;

      if (!isBlocked) {
        return {};
      }

      return {
        disabled: true,
        className:
          'relative bg-muted/40 opacity-70 pointer-events-none after:absolute after:inset-0 after:bg-background/40 after:content-[""] after:animate-pulse',
      };
    },
    [itemStatuses],
  );

  // Calculate actual assessment progress
  const assessmentProgress = useMemo(() => {
    if (!progress || !itemsInfo.length) {
      return null;
    }

    // Count vendors that are completed (either 'completed' in metadata or 'assessed' in DB)
    const completedCount = vendors.filter((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      return metadataStatus === 'completed' || vendor.status === 'assessed';
    }).length;

    // Also count vendors in metadata that are completed but not yet in DB
    const completedInMetadata = Object.values(itemStatuses).filter(
      (status) => status === 'completed',
    ).length;

    // Total is the max of progress.total, itemsInfo.length, or actual vendors created
    const total = Math.max(progress.total, itemsInfo.length, vendors.length);

    // Completed is the max of DB assessed vendors or metadata completed
    const completed = Math.max(completedCount, completedInMetadata);

    return { total, completed };
  }, [progress, itemsInfo, vendors, itemStatuses]);

  const isEmpty = mergedVendors.length === 0;
  // Show empty state if onboarding is active (even if progress metadata isn't set yet)
  const showEmptyState = isEmpty && onboardingRunId && isActive;

  // Prevent flicker: if we're loading onboarding status and have a runId, render null
  // Once we know the status, show animation if empty and active, otherwise show table
  if (onboardingRunId && isLoading) {
    return null;
  }

  // Show loading animation instead of table when empty and onboarding is active
  if (showEmptyState) {
    return (
      <>
        <OnboardingLoadingAnimation
          itemType="vendors"
          title="AI is working on your vendors"
          description="Our AI is analyzing your organization and creating vendor assessments. This may take a few moments."
        />
        <CreateVendorSheet assignees={assignees} />
      </>
    );
  }

  return (
    <>
      <VendorOnboardingProvider statuses={itemStatuses}>
        <DataTable
          table={table}
          getRowId={(row) => row.id}
          rowClickBasePath={`/${orgId}/vendors`}
          getRowProps={getRowProps}
        >
          <>
            <DataTableToolbar table={table} sheet="createVendorSheet" action="Add Vendor" />
            {isActive && !allVendorsDoneAssessing && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">
                    {assessmentProgress
                      ? assessmentProgress.completed === 0
                        ? 'Researching and creating vendors'
                        : assessmentProgress.completed < assessmentProgress.total
                          ? 'Assessing vendors and generating risk assessments'
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
          </>
        </DataTable>
      </VendorOnboardingProvider>
      <CreateVendorSheet assignees={assignees} />
    </>
  );
}
