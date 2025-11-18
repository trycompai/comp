'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { CreateVendorSheet } from '../../components/create-vendor-sheet';
import type { GetAssigneesResult, GetVendorsResult } from '../data/queries';
import { columns } from './VendorColumns';
import { useOnboardingStatus } from '../hooks/use-onboarding-status';

interface VendorsTableProps {
  promises: Promise<[GetVendorsResult, GetAssigneesResult]>;
  onboardingRunId?: string | null;
}

type VendorRow = GetVendorsResult['data'][number] & { isPending?: boolean; isAssessing?: boolean };

const ACTIVE_STATUSES: Array<'pending' | 'processing' | 'created' | 'assessing'> = [
  'pending',
  'processing',
  'created',
  'assessing',
];

export function VendorsTable({ promises, onboardingRunId }: VendorsTableProps) {
  const { orgId } = useParams();
  const router = useRouter();

  // Resolve the promise data here
  const [{ data: vendors, pageCount }, assignees] = React.use(promises);

  const seenVendorIdsRef = React.useRef<Set<string>>(new Set(vendors.map((v) => v.id)));

  const { itemStatuses, progress, itemsInfo, isActive } = useOnboardingStatus(
    onboardingRunId,
    'vendors',
  );

  // Refetch vendors when new ones are created (detected via metadata)
  React.useEffect(() => {
    if (!onboardingRunId || !itemsInfo.length) return;

    // Check if any vendors have been created (status is 'created', 'assessing', or 'completed')
    // and we haven't seen them in the DB yet
    const createdVendorIds = itemsInfo
      .filter((item) => {
        const status = itemStatuses[item.id];
        return (
          (status === 'created' || status === 'assessing' || status === 'completed') &&
          !item.id.startsWith('temp_') &&
          !seenVendorIdsRef.current.has(item.id)
        );
      })
      .map((item) => item.id);

    if (createdVendorIds.length > 0) {
      // Mark these as seen
      createdVendorIds.forEach((id) => seenVendorIdsRef.current.add(id));
      // Refresh to fetch new vendors from DB
      router.refresh();
    }
  }, [itemsInfo, itemStatuses, onboardingRunId, router]);

  // Update seen vendors when vendors prop changes
  React.useEffect(() => {
    vendors.forEach((vendor) => {
      seenVendorIdsRef.current.add(vendor.id);
    });
  }, [vendors]);

  // Merge DB vendors with metadata vendors (pending ones)
  const mergedVendors = React.useMemo<VendorRow[]>(() => {
    const dbVendorIds = new Set(vendors.map((v) => v.id));
    
    // Mark vendors in DB as "assessing" if they're not_assessed and onboarding is active
    const vendorsWithStatus = vendors.map((vendor) => {
      const metadataStatus = itemStatuses[vendor.id];
      // If vendor exists in DB but status is not_assessed and onboarding is active, it's being assessed
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
          organizationId: orgId as string,
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
          organizationId: orgId as string,
          assigneeId: null,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPending: true,
        } as VendorRow;
      });

    return [...vendorsWithStatus, ...pendingVendors, ...tempVendors];
  }, [vendors, itemsInfo, itemStatuses, orgId, isActive, onboardingRunId]);

  // Define columns memoized
  const memoizedColumns = React.useMemo(() => columns, []);

  const { table } = useDataTable({
    data: mergedVendors,
    columns: memoizedColumns,
    pageCount: pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
      sorting: [{ id: 'name', desc: true }],
    },
    shallow: false,
    clearOnDefault: true,
  });

  const getRowProps = React.useMemo(
    () => (vendor: VendorRow) => {
      const status = itemStatuses[vendor.id] || (vendor.isPending ? 'pending' : undefined);
      const isAssessing = vendor.isAssessing || status === 'assessing';
      const isBlocked = 
        (status && ACTIVE_STATUSES.includes(status as 'pending' | 'processing' | 'created' | 'assessing')) ||
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

  const isEmpty = mergedVendors.length === 0;
  // Show empty state if onboarding is active (even if progress metadata isn't set yet)
  const showEmptyState = isEmpty && onboardingRunId && isActive;

  return (
    <>
      <DataTable
        table={table}
        getRowId={(row) => row.id}
        rowClickBasePath={`/${orgId}/vendors`}
        getRowProps={getRowProps}
      >
        <>
          <DataTableToolbar table={table} sheet="createVendorSheet" action="Add Vendor" />
          {isActive && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-primary">
                  {progress
                    ? progress.completed === 0
                      ? 'Researching and creating vendors'
                      : progress.completed < progress.total
                        ? 'Assessing vendors and generating risk assessments'
                        : 'Assessing vendors and generating risk assessments'
                    : 'Researching and creating vendors'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {progress
                    ? progress.completed === 0
                      ? 'AI is analyzing your organization...'
                      : `${progress.completed}/${progress.total} vendors created`
                    : 'AI is analyzing your organization...'}
                </span>
              </div>
            </div>
          )}
          {showEmptyState && (
            <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">AI is working on your vendors</h3>
              <p className="text-muted-foreground max-w-md text-sm">
                Our AI is analyzing your organization and creating vendor assessments. This may take a few moments.
              </p>
            </div>
          )}
        </>
      </DataTable>
      <CreateVendorSheet assignees={assignees} />
    </>
  );
}
