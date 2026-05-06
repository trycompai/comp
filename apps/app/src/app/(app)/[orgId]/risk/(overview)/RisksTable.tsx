'use client';

import { RiskScoreBadge } from '@/components/risks/RiskScoreBadge';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useRiskActions,
  useRisks,
  type Risk as ApiRisk,
  type RiskAssignee,
  type RisksQueryParams,
} from '@/hooks/use-risks';
import { getSortingStateParser } from '@/lib/parsers';
import { getRiskLevelFromScore, getRiskScore, LEVEL_LABEL } from '@/lib/risk-score';
import {
  interpolatedResidualScore,
  previewResidual,
  suggestedResidual,
} from '@/lib/suggested-residual';
import { TaskStatus } from '@db';
import type { Member, User } from '@db';
import { Risk as RiskType } from '@db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  parseAsString,
  useQueryState,
} from 'nuqs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RiskOnboardingProvider } from './components/risk-onboarding-context';
import { RisksLoadingAnimation } from './components/risks-loading-animation';
import { useOnboardingStatus } from './hooks/use-onboarding-status';

export type RiskRow = ApiRisk & { isPending?: boolean; isAssessing?: boolean };

const ACTIVE_STATUSES: Array<'pending' | 'processing' | 'created' | 'assessing'> = [
  'pending',
  'processing',
  'created',
  'assessing',
];

/**
 * The risk's current severity score (1-10), interpolated by linked-task
 * completion the same way the Treatment Plan hero does it. Returns the
 * inherent score when there's no linked work or the strategy doesn't
 * project a reduction. Falls back to inherent on malformed input.
 */
function currentSeverityScore(risk: {
  likelihood: ApiRisk['likelihood'];
  impact: ApiRisk['impact'];
  treatmentStrategy: ApiRisk['treatmentStrategy'];
  tasks?: Array<{ status: TaskStatus }>;
}): number {
  const inherent = getRiskScore(risk.likelihood, risk.impact);
  const tasks = risk.tasks ?? [];
  const target = previewResidual({
    inherentLikelihood: risk.likelihood,
    inherentImpact: risk.impact,
    strategy: risk.treatmentStrategy,
    hasLinkedWork: tasks.length > 0,
  });
  const targetScore = getRiskScore(target.likelihood, target.impact).score;
  const completion = suggestedResidual({
    likelihood: risk.likelihood,
    impact: risk.impact,
    strategy: risk.treatmentStrategy,
    tasks,
  }).completion;
  return interpolatedResidualScore({
    inherentScore: inherent.score,
    targetScore,
    completion,
  });
}


const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
  archived: 'Archived',
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return <Badge variant="outline">Open</Badge>;
    case 'pending':
      return <Badge variant="secondary">Pending</Badge>;
    case 'closed':
      return <Badge variant="default">Resolved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export const RisksTable = ({
  risks: initialRisks,
  assignees,
  pageCount: initialPageCount,
  onboardingRunId,
  orgId,
}: {
  risks: RiskRow[];
  assignees: (Member & { user: User })[];
  pageCount: number;
  onboardingRunId?: string | null;
  orgId: string;
}) => {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { deleteRisk } = useRiskActions();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<RiskRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { itemStatuses, progress, itemsInfo, isActive, isLoading } = useOnboardingStatus(
    onboardingRunId,
    'risks',
  );

  // Pagination state (local, not URL)
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Read current search params from URL
  const [title, setTitle] = useQueryState('title', parseAsString.withDefault(''));
  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString.withDefault(''),
  );
  const [assigneeFilter, setAssigneeFilter] = useQueryState(
    'assignee',
    parseAsString.withDefault(''),
  );
  // Severity is computed from the current treatment-aware score, so it's
  // filtered client-side after fetch (the API can't query a derived value).
  const [severityFilter, setSeverityFilter] = useQueryState(
    'severity',
    parseAsString.withDefault(''),
  );
  const [sort, setSort] = useQueryState(
    'sort',
    getSortingStateParser<RiskType>().withDefault([{ id: 'title', desc: false }]),
  );

  // Build query params for the API. Status and assignee are server-side;
  // severity is computed from the current treatment-aware score (which the
  // API can't query directly), so when severity is filtered we fetch
  // the org's full risk set in one page and paginate after the filter.
  // Without this, severity filtering would only see whatever happened to
  // be on the current server page — causing wrong/missing results and an
  // incorrect total count. (Cubic finding #27 on PR #2671.)
  const FILTER_ALL_PAGE_SIZE = 1000;
  const fetchAllForSeverity = Boolean(severityFilter);
  const queryParams = useMemo<RisksQueryParams>(() => {
    const currentSort = sort[0];
    return {
      page: fetchAllForSeverity ? 1 : page,
      perPage: fetchAllForSeverity ? FILTER_ALL_PAGE_SIZE : perPage,
      ...(title && { title }),
      ...(statusFilter && { status: statusFilter }),
      ...(assigneeFilter && { assigneeId: assigneeFilter }),
      ...(currentSort && {
        sort: currentSort.id,
        sortDirection: currentSort.desc ? 'desc' as const : 'asc' as const,
      }),
    };
  }, [page, perPage, title, statusFilter, assigneeFilter, sort, fetchAllForSeverity]);

  // Use the useRisks hook with query params
  const { data: risksData, mutate: mutateRisks } = useRisks({
    initialData: initialRisks,
    queryParams,
    refreshInterval: isActive ? 1000 : 5000,
    keepPreviousData: true,
  });

  // Full result set from the API — already narrowed by status/assignee/title.
  const fullList = useMemo(() => {
    const apiData = risksData?.data?.data;
    return Array.isArray(apiData) ? apiData : initialRisks;
  }, [risksData, initialRisks]);

  // After server filtering, apply the (derived) severity filter and then
  // re-paginate client-side so totals reflect the filtered result.
  const filteredList = useMemo(() => {
    if (!severityFilter) return fullList;
    return fullList.filter((risk) => {
      const score = currentSeverityScore(risk);
      return getRiskLevelFromScore(score) === severityFilter;
    });
  }, [fullList, severityFilter]);

  const risks = useMemo(() => {
    if (!fetchAllForSeverity) return filteredList;
    const start = (page - 1) * perPage;
    return filteredList.slice(start, start + perPage);
  }, [filteredList, fetchAllForSeverity, page, perPage]);

  const pageCount = useMemo(() => {
    if (fetchAllForSeverity) {
      return Math.max(1, Math.ceil(filteredList.length / perPage));
    }
    return risksData?.data?.pageCount ?? initialPageCount;
  }, [fetchAllForSeverity, filteredList.length, perPage, risksData, initialPageCount]);

  // Check if all risks are done assessing
  const allRisksDoneAssessing = useMemo(() => {
    if (risks.length === 0) {
      if (itemsInfo.length > 0) return false;
      return false;
    }

    if (progress && risks.length < progress.total) {
      return false;
    }

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

    const allDbRisksDone = risks.every((risk) => {
      const metadataStatus = itemStatuses[risk.id];
      return metadataStatus === 'completed' || risk.status === 'closed';
    });

    const hasAssessingRisks = Object.values(itemStatuses).some(
      (status) => status === 'assessing' || status === 'processing',
    );

    return allDbRisksDone && !hasAssessingRisks;
  }, [risks, itemStatuses, itemsInfo, progress]);

  // Merge DB risks with metadata risks (pending ones)
  const mergedRisks = useMemo<RiskRow[]>(() => {
    const dbRiskIds = new Set(risks.map((r) => r.id));

    const risksWithStatus = risks.map((risk) => {
      const metadataStatus = itemStatuses[risk.id];
      if (risk.status === 'open' && isActive && onboardingRunId && !metadataStatus) {
        return { ...risk, isAssessing: true };
      }
      return risk;
    });

    const now = new Date().toISOString();
    const pendingRisks: RiskRow[] = itemsInfo
      .filter((item) => {
        const status = itemStatuses[item.id];
        return (
          (status === 'pending' || status === 'processing') &&
          !dbRiskIds.has(item.id) &&
          !item.id.startsWith('temp_')
        );
      })
      .map((item) => ({
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
        createdAt: now,
        updatedAt: now,
        isPending: true,
      }));

    const tempRisks: RiskRow[] = itemsInfo
      .filter((item) => item.id.startsWith('temp_'))
      .map((item) => ({
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
        createdAt: now,
        updatedAt: now,
        isPending: true,
      }));

    return [...risksWithStatus, ...pendingRisks, ...tempRisks];
  }, [risks, itemsInfo, itemStatuses, orgId, isActive, onboardingRunId]);

  // Calculate assessment progress
  const assessmentProgress = useMemo(() => {
    if (!progress || !itemsInfo.length) {
      return null;
    }

    const completedCount = risks.filter((risk) => {
      const metadataStatus = itemStatuses[risk.id];
      return metadataStatus === 'completed' || risk.status === 'closed';
    }).length;

    const completedInMetadata = Object.values(itemStatuses).filter(
      (status) => status === 'completed',
    ).length;

    const total = Math.max(progress.total, itemsInfo.length, risks.length);
    const completed = Math.max(completedCount, completedInMetadata);

    return { total, completed };
  }, [progress, itemsInfo, risks, itemStatuses]);

  const isRowBlocked = (risk: RiskRow) => {
    const status = itemStatuses[risk.id] || (risk.isPending ? 'pending' : undefined);
    const isAssessing = risk.isAssessing || status === 'assessing';
    return (
      (status &&
        ACTIVE_STATUSES.includes(status as 'pending' | 'processing' | 'created' | 'assessing')) ||
      isAssessing
    );
  };

  const handleRowClick = (riskId: string) => {
    router.push(`/${orgId}/risk/${riskId}`);
  };

  const handleSort = (columnId: 'title' | 'updatedAt') => {
    const currentSort = sort[0];
    if (currentSort?.id === columnId) {
      // Toggle direction
      setSort([{ id: columnId, desc: !currentSort.desc }]);
    } else {
      // New column, default to ascending
      setSort([{ id: columnId, desc: false }]);
    }
  };

  const getSortIcon = (columnId: 'title' | 'updatedAt') => {
    const currentSort = sort[0];
    if (currentSort?.id !== columnId) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />;
    }
    return currentSort.desc ? (
      <ArrowDown className="ml-1 h-3 w-3" />
    ) : (
      <ArrowUp className="ml-1 h-3 w-3" />
    );
  };

  const handleDeleteClick = (risk: RiskRow) => {
    setRiskToDelete(risk);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!riskToDelete) return;

    setIsDeleting(true);
    try {
      await deleteRisk(riskToDelete.id);
      toast.success('Risk deleted successfully');
      setDeleteDialogOpen(false);
      setRiskToDelete(null);
      mutateRisks();
    } catch {
      toast.error('Failed to delete risk');
    } finally {
      setIsDeleting(false);
    }
  };

  const isEmpty = mergedRisks.length === 0;
  const showEmptyState = isEmpty && onboardingRunId && isActive;
  const emptyTitle = title ? 'No risks found' : 'No risks yet';
  const emptyDescription = title
    ? 'Try adjusting your search.'
    : 'Create your first risk to get started.';
  const pageSizeOptions = [10, 25, 50, 100];

  if (showEmptyState) {
    return <RisksLoadingAnimation />;
  }

  return (
    <RiskOnboardingProvider statuses={itemStatuses}>
      <Stack gap="4">
        {/* Search + Filters. Severity is client-side (derived score),
            Status and Owner are server-side via the risks API. Each
            filter is URL-backed so links are shareable. */}
        <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <div className="w-full md:max-w-[300px]">
            <InputGroup>
              <InputGroupAddon>
                <Search size={16} />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search risks..."
                value={title}
                onChange={(e) => setTitle(e.target.value || null)}
              />
            </InputGroup>
          </div>
          <div className="w-full md:w-[160px]">
            <Select
              value={severityFilter || 'all'}
              onValueChange={(v) => setSeverityFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity">
                  {(value: string) =>
                    value && value !== 'all'
                      ? LEVEL_LABEL[value as keyof typeof LEVEL_LABEL] ?? value
                      : 'All severities'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="very-high">Very high</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="very-low">Very low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[160px]">
            <Select
              value={statusFilter || 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status">
                  {(value: string) =>
                    value && value !== 'all'
                      ? STATUS_LABEL[value] ?? value
                      : 'All statuses'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[200px]">
            <Select
              value={assigneeFilter || 'all'}
              onValueChange={(v) => setAssigneeFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Owner">
                  {(value: string) => {
                    if (!value || value === 'all') return 'All owners';
                    const a = assignees.find((m) => m.id === value);
                    return a?.user?.name || a?.user?.email || 'Unknown';
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {assignees.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.user?.name || a.user?.email || 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(severityFilter || statusFilter || assigneeFilter || title) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void setTitle(null);
                void setSeverityFilter(null);
                void setStatusFilter(null);
                void setAssigneeFilter(null);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Onboarding Progress Banner */}
        {isActive && !allRisksDoneAssessing && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-primary">
                {assessmentProgress
                  ? assessmentProgress.completed === 0
                    ? 'Researching and creating risks'
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
              pageCount,
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
                      onClick={() => handleSort('title')}
                      className="flex items-center hover:text-foreground"
                    >
                      RISK
                      {getSortIcon('title')}
                    </button>
                  </TableHead>
                  <TableHead>SEVERITY</TableHead>
                  <TableHead>INHERENT</TableHead>
                  <TableHead>CURRENT</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>OWNER</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('updatedAt')}
                      className="flex items-center hover:text-foreground"
                    >
                      UPDATED
                      {getSortIcon('updatedAt')}
                    </button>
                  </TableHead>
                  {hasPermission('risk', 'delete') && <TableHead>ACTIONS</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mergedRisks.map((risk) => {
                  const blocked = isRowBlocked(risk);
                  return (
                    <TableRow
                      key={risk.id}
                      onClick={() => !blocked && handleRowClick(risk.id)}
                      style={{ cursor: blocked ? 'default' : 'pointer' }}
                      data-state={blocked ? 'disabled' : undefined}
                    >
                      <TableCell>
                        <HStack gap="2" align="center">
                          {blocked && <Spinner />}
                          <Text>{risk.title}</Text>
                        </HStack>
                      </TableCell>
                      {(() => {
                        // Three score columns paint the before-vs-now picture:
                        //   SEVERITY = current treatment-aware level (text).
                        //   INHERENT = raw score before treatment, fixed.
                        //   CURRENT  = treatment-aware score interpolated by
                        //              linked-task completion. Named "Current"
                        //              (not "Residual") because the canonical
                        //              residual is the *target* score at 100%
                        //              completion — what's shown here moves
                        //              with progress and matches the hero's
                        //              "Currently X/10" subline.
                        // SEVERITY is plain text and CURRENT carries the
                        // colored chip so we don't double-paint the band.
                        const inherentScore = getRiskScore(risk.likelihood, risk.impact).score;
                        const score = currentSeverityScore(risk);
                        const level = getRiskLevelFromScore(score);
                        return (
                          <>
                            <TableCell>
                              <Text>{LEVEL_LABEL[level]}</Text>
                            </TableCell>
                            <TableCell>
                              <RiskScoreBadge score={inherentScore} />
                            </TableCell>
                            <TableCell>
                              <RiskScoreBadge score={score} />
                            </TableCell>
                          </>
                        );
                      })()}
                      <TableCell>{getStatusBadge(risk.status)}</TableCell>
                      <TableCell>
                        <Text>{risk.assignee?.user?.name || 'Unassigned'}</Text>
                      </TableCell>
                      <TableCell>
                        <Text>{formatDate(risk.updatedAt)}</Text>
                      </TableCell>
                      {hasPermission('risk', 'delete') && (
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
                                    handleDeleteClick(risk);
                                  }}
                                >
                                  <TrashCan size={16} />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      )}
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
              <AlertDialogTitle>Delete Risk</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{riskToDelete?.title}"? This action cannot be
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
    </RiskOnboardingProvider>
  );
};
