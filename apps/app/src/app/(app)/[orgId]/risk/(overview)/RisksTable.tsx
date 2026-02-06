'use client';

import {
  useRiskActions,
  useRisks,
  type Risk as ApiRisk,
  type RiskAssignee,
  type RisksQueryParams,
} from '@/hooks/use-risks';
import { getSortingStateParser } from '@/lib/parsers';
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

function getSeverityBadge(likelihood: string, impact: string) {
  // Calculate severity based on likelihood and impact
  const likelihoodScore: Record<string, number> = {
    very_unlikely: 1,
    unlikely: 2,
    possible: 3,
    likely: 4,
    very_likely: 5,
  };
  const impactScore: Record<string, number> = {
    insignificant: 1,
    minor: 2,
    moderate: 3,
    major: 4,
    severe: 5,
  };

  const score = (likelihoodScore[likelihood] || 1) * (impactScore[impact] || 1);

  if (score >= 15) {
    return <Badge variant="destructive">High</Badge>;
  }
  if (score >= 8) {
    return <Badge variant="secondary">Medium</Badge>;
  }
  return <Badge variant="outline">Low</Badge>;
}

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
  const [sort, setSort] = useQueryState(
    'sort',
    getSortingStateParser<RiskType>().withDefault([{ id: 'title', desc: false }]),
  );

  // Build query params for the API
  const queryParams = useMemo<RisksQueryParams>(() => {
    const currentSort = sort[0];
    return {
      page,
      perPage,
      ...(title && { title }),
      ...(currentSort && {
        sort: currentSort.id,
        sortDirection: currentSort.desc ? 'desc' as const : 'asc' as const,
      }),
    };
  }, [page, perPage, title, sort]);

  // Use the useRisks hook with query params
  const { data: risksData, mutate: mutateRisks } = useRisks({
    initialData: initialRisks,
    queryParams,
    refreshInterval: isActive ? 1000 : 5000,
    keepPreviousData: true,
  });

  const risks = useMemo(() => {
    const apiData = risksData?.data?.data;
    return Array.isArray(apiData) ? apiData : initialRisks;
  }, [risksData, initialRisks]);

  const pageCount = risksData?.data?.pageCount ?? initialPageCount;

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
        {/* Search Bar */}
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
                  <TableHead>ACTIONS</TableHead>
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
                      <TableCell>{getSeverityBadge(risk.likelihood, risk.impact)}</TableCell>
                      <TableCell>{getStatusBadge(risk.status)}</TableCell>
                      <TableCell>
                        <Text>{risk.assignee?.user?.name || 'Unassigned'}</Text>
                      </TableCell>
                      <TableCell>
                        <Text>{formatDate(risk.updatedAt)}</Text>
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
