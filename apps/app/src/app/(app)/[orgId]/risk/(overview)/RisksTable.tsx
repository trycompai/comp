'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { CreateRiskSheet } from '@/components/sheets/create-risk-sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { getFiltersStateParser, getSortingStateParser } from '@/lib/parsers';
import type { Member, Risk, User } from '@db';
import { Risk as RiskType } from '@db';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
} from 'nuqs';
import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import * as z from 'zod/v3';
import { getRisksAction } from './actions/get-risks-action';
import { RiskOnboardingProvider } from './components/risk-onboarding-context';
import { RisksLoadingAnimation } from './components/risks-loading-animation';
import { columns as getColumns } from './components/table/RiskColumns';
import type { GetRiskSchema } from './data/validations';
import { useOnboardingStatus } from './hooks/use-onboarding-status';

export type RiskRow = Risk & { assignee: User | null; isPending?: boolean; isAssessing?: boolean };

const ACTIVE_STATUSES: Array<'pending' | 'processing' | 'created' | 'assessing'> = [
  'pending',
  'processing',
  'created',
  'assessing',
];

export const RisksTable = ({
  risks: initialRisks,
  assignees,
  pageCount: initialPageCount,
  onboardingRunId,
  searchParams: initialSearchParams,
  orgId,
}: {
  risks: RiskRow[];
  assignees: (Member & { user: User })[];
  pageCount: number;
  onboardingRunId?: string | null;
  searchParams: GetRiskSchema;
  orgId: string;
}) => {
  const [_, setOpenSheet] = useQueryState('create-risk-sheet');

  const { itemStatuses, progress, itemsInfo, isActive, isLoading } = useOnboardingStatus(
    onboardingRunId,
    'risks',
  );

  // Read current search params from URL (synced with table state via useDataTable)
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [perPage] = useQueryState('perPage', parseAsInteger.withDefault(50));
  const [title] = useQueryState('title', parseAsString.withDefault(''));
  const [sort] = useQueryState(
    'sort',
    getSortingStateParser<RiskType>().withDefault([{ id: 'title', desc: true }]),
  );
  const [filters] = useQueryState('filters', getFiltersStateParser().withDefault([]));
  const [joinOperator] = useQueryState(
    'joinOperator',
    parseAsStringEnum(['and', 'or']).withDefault('and'),
  );
  const [lastUpdated] = useQueryState(
    'lastUpdated',
    parseAsArrayOf(z.coerce.date()).withDefault([]),
  );

  // Build current search params from URL state
  const currentSearchParams = useMemo<GetRiskSchema>(() => {
    return {
      page,
      perPage,
      title,
      sort,
      filters,
      joinOperator,
      lastUpdated,
    };
  }, [page, perPage, title, sort, filters, joinOperator, lastUpdated]);

  // Create stable SWR key from current search params
  const swrKey = useMemo(() => {
    if (!orgId) return null;
    // Serialize search params to create a stable key
    const key = JSON.stringify(currentSearchParams);
    return ['risks', orgId, key] as const;
  }, [orgId, currentSearchParams]);

  // Fetcher function for SWR
  const fetcher = useCallback(async () => {
    if (!orgId) return { data: [], pageCount: 0 };
    return await getRisksAction({ orgId, searchParams: currentSearchParams });
  }, [orgId, currentSearchParams]);

  // Use SWR to fetch risks with polling when onboarding is active
  const { data: risksData } = useSWR(swrKey, fetcher, {
    fallbackData: { data: initialRisks, pageCount: initialPageCount },
    refreshInterval: isActive ? 1000 : 0, // Poll every 1 second when onboarding is active
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  });

  const risks = risksData?.data || initialRisks;
  const pageCount = risksData?.pageCount ?? initialPageCount;

  // Check if all risks are done assessing (either completed in metadata or closed in DB)
  // Also check if there are any pending/processing risks in metadata that haven't been created yet
  const allRisksDoneAssessing = useMemo(() => {
    // If no risks exist yet, we're not done
    if (risks.length === 0) {
      // But check if there are risks in metadata that should exist
      if (itemsInfo.length > 0) return false;
      return false;
    }

    // Check if we're still creating risks by comparing DB count with expected total
    // If progress.total exists and risks.length < progress.total, we're still creating
    if (progress && risks.length < progress.total) {
      return false;
    }

    // If there are pending/processing risks in metadata that aren't in DB yet, we're not done
    const hasPendingRisks = itemsInfo.some((item) => {
      const status = itemStatuses[item.id];
      return (
        (status === 'pending' ||
          status === 'processing' ||
          status === 'created' ||
          status === 'assessing') &&
        !risks.some((r) => r.id === item.id)
      );
    });

    if (hasPendingRisks) return false;

    // Check if all risks in DB are either:
    // 1. Completed in metadata (status === 'completed')
    // 2. Closed in database (status === 'closed')
    const allDbRisksDone = risks.every((risk) => {
      const metadataStatus = itemStatuses[risk.id];
      return metadataStatus === 'completed' || risk.status === 'closed';
    });

    // Also check if there are any risks in metadata that are still assessing
    const hasAssessingRisks = Object.values(itemStatuses).some(
      (status) => status === 'assessing' || status === 'processing',
    );

    return allDbRisksDone && !hasAssessingRisks;
  }, [risks, itemStatuses, itemsInfo, progress]);

  // Merge DB risks with metadata risks (pending ones)
  const mergedRisks = useMemo<RiskRow[]>(() => {
    const dbRiskIds = new Set(risks.map((r) => r.id));

    // Mark risks in DB as "assessing" if they're open and onboarding is active
    // Don't mark as assessing if risk is already closed (resolved)
    const risksWithStatus = risks.map((risk) => {
      const metadataStatus = itemStatuses[risk.id];
      // If risk exists in DB but status is open and onboarding is active, it's being assessed
      // Only mark as assessing if status is open (not closed)
      if (risk.status === 'open' && isActive && onboardingRunId && !metadataStatus) {
        return { ...risk, isAssessing: true };
      }
      return risk;
    });

    const pendingRisks: RiskRow[] = itemsInfo
      .filter((item) => {
        // Only show items that are pending/processing and not yet in DB
        const status = itemStatuses[item.id];
        return (
          (status === 'pending' || status === 'processing') &&
          !dbRiskIds.has(item.id) &&
          !item.id.startsWith('temp_')
        );
      })
      .map((item) => {
        // Create a placeholder risk row for pending items
        const status = itemStatuses[item.id];
        return {
          id: item.id,
          title: item.name,
          description: 'Being researched and created by AI...',
          category: 'other' as const,
          department: null,
          status: 'open' as const,
          likelihood: 'very_unlikely' as const,
          impact: 'insignificant' as const,
          residualLikelihood: 'very_unlikely' as const,
          residualImpact: 'insignificant' as const,
          treatmentStrategy: 'accept' as const,
          treatmentStrategyDescription: null,
          organizationId: orgId,
          assigneeId: null,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPending: true,
        } as RiskRow;
      });

    // Also handle temp IDs (risks being created)
    const tempRisks: RiskRow[] = itemsInfo
      .filter((item) => item.id.startsWith('temp_'))
      .map((item) => {
        const status = itemStatuses[item.id];
        return {
          id: item.id,
          title: item.name,
          description: 'Being researched and created by AI...',
          category: 'other' as const,
          department: null,
          status: 'open' as const,
          likelihood: 'very_unlikely' as const,
          impact: 'insignificant' as const,
          residualLikelihood: 'very_unlikely' as const,
          residualImpact: 'insignificant' as const,
          treatmentStrategy: 'accept' as const,
          treatmentStrategyDescription: null,
          organizationId: orgId,
          assigneeId: null,
          assignee: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isPending: true,
        } as RiskRow;
      });

    return [...risksWithStatus, ...pendingRisks, ...tempRisks];
  }, [risks, itemsInfo, itemStatuses, orgId, isActive, onboardingRunId]);

  const columns = useMemo<ColumnDef<RiskRow>[]>(() => getColumns(orgId), [orgId]);

  const { table } = useDataTable({
    data: mergedRisks,
    columns,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageSize: 50,
        pageIndex: 0,
      },
      sorting: [{ id: 'title', desc: true }],
      columnPinning: { right: ['actions'] },
    },
    shallow: false,
    clearOnDefault: true,
  });

  const getRowProps = useMemo(
    () => (risk: RiskRow) => {
      const status = itemStatuses[risk.id] || (risk.isPending ? 'pending' : undefined);
      const isAssessing = risk.isAssessing || status === 'assessing';
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

    // Count risks that are completed (either 'completed' in metadata or 'closed' in DB)
    const completedCount = risks.filter((risk) => {
      const metadataStatus = itemStatuses[risk.id];
      return metadataStatus === 'completed' || risk.status === 'closed';
    }).length;

    // Also count risks in metadata that are completed but not yet in DB
    const completedInMetadata = Object.values(itemStatuses).filter(
      (status) => status === 'completed',
    ).length;

    // Total is the max of progress.total, itemsInfo.length, or actual risks created
    const total = Math.max(progress.total, itemsInfo.length, risks.length);

    // Completed is the max of DB closed risks or metadata completed
    const completed = Math.max(completedCount, completedInMetadata);

    return { total, completed };
  }, [progress, itemsInfo, risks, itemStatuses]);

  const isEmpty = mergedRisks.length === 0;
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
        <RisksLoadingAnimation />
        <CreateRiskSheet assignees={assignees} />
      </>
    );
  }

  return (
    <>
      <RiskOnboardingProvider statuses={itemStatuses}>
        <DataTable
          table={table}
          getRowId={(row) => row.id}
          rowClickBasePath={`/${orgId}/risk`}
          getRowProps={getRowProps}
        >
          <>
            <DataTableToolbar table={table} sheet="create-risk-sheet" action="Create Risk" />
            {isActive && !allRisksDoneAssessing && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">
                    {assessmentProgress
                      ? assessmentProgress.completed === 0
                        ? 'Researching and creating risks'
                        : assessmentProgress.completed < assessmentProgress.total
                          ? 'Assessing risks and generating mitigation plans'
                          : 'Assessing risks and generating mitigation plans'
                      : progress
                        ? progress.completed === 0
                          ? 'Researching and creating risks'
                          : 'Assessing risks and generating mitigation plans'
                        : 'Researching and creating risks'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {assessmentProgress
                      ? assessmentProgress.completed === 0
                        ? 'AI is analyzing your organization...'
                        : `${assessmentProgress.completed}/${assessmentProgress.total} risks assessed`
                      : progress
                        ? progress.completed === 0
                          ? 'AI is analyzing your organization...'
                          : `${progress.completed}/${progress.total} risks created`
                        : 'AI is analyzing your organization...'}
                  </span>
                </div>
              </div>
            )}
          </>
        </DataTable>
      </RiskOnboardingProvider>
      <CreateRiskSheet assignees={assignees} />
    </>
  );
};
