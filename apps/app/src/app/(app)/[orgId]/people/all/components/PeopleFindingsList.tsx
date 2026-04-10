'use client';

import {
  FINDING_SCOPE_LABELS,
  useFindingActions,
  useScopeFindings,
  type Finding,
} from '@/hooks/use-findings-api';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@trycompai/design-system';
import { FindingScope, FindingStatus } from '@db';
import {
  ChevronDown,
  ChevronUp,
  WarningAlt,
  WarningAltFilled,
} from '@trycompai/design-system/icons';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreateFindingButton } from '../../../tasks/[taskId]/components/findings/CreateFindingButton';
import { FindingItem } from '../../../tasks/[taskId]/components/findings/FindingItem';

const INITIAL_DISPLAY_COUNT = 5;

const SCOPE_FILTER_ALL = 'all' as const;

interface PeopleFindingsListProps {
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
  onViewHistory?: (findingId: string) => void;
}

const STATUS_ORDER: Record<FindingStatus, number> = {
  [FindingStatus.open]: 0,
  [FindingStatus.needs_revision]: 1,
  [FindingStatus.ready_for_review]: 2,
  [FindingStatus.closed]: 3,
};

export function PeopleFindingsList({
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
  onViewHistory,
}: PeopleFindingsListProps) {
  const { data, isLoading, error, mutate } = useScopeFindings();
  const { updateFinding, deleteFinding } = useFindingActions();
  const { hasPermission } = usePermissions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<typeof SCOPE_FILTER_ALL | FindingScope>(
    SCOPE_FILTER_ALL,
  );

  const rawFindings = data?.data || [];

  const scopeFilteredFindings = useMemo(() => {
    if (scopeFilter === SCOPE_FILTER_ALL) {
      return rawFindings;
    }
    return rawFindings.filter((f: Finding) => f.scope === scopeFilter);
  }, [rawFindings, scopeFilter]);

  const sortedFindings = useMemo(() => {
    return [...scopeFilteredFindings].sort((a: Finding, b: Finding) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [scopeFilteredFindings]);

  const visibleFindings = showAll ? sortedFindings : sortedFindings.slice(0, INITIAL_DISPLAY_COUNT);
  const hiddenCount = sortedFindings.length - visibleFindings.length;

  const canCreateFinding = hasPermission('finding', 'create') && (isAuditor || isPlatformAdmin);
  const canUpdateFinding = hasPermission('finding', 'update');
  const canDeleteFinding = hasPermission('finding', 'delete');
  const canChangeStatus = canUpdateFinding || isAuditor || isPlatformAdmin || isAdminOrOwner;
  const canSetRestrictedStatus = isAuditor || isPlatformAdmin;

  const handleStatusChange = useCallback(
    async (findingId: string, status: FindingStatus, revisionNote?: string) => {
      try {
        const updateData: { status: FindingStatus; revisionNote?: string | null } = { status };

        if (status === FindingStatus.needs_revision && revisionNote) {
          updateData.revisionNote = revisionNote;
        }

        await updateFinding(findingId, updateData);
        toast.success(
          revisionNote ? 'Finding marked for revision with note' : 'Finding status updated',
        );
        mutate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [updateFinding, mutate],
  );

  const handleDelete = useCallback(
    async (findingId: string) => {
      if (!confirm('Are you sure you want to delete this finding?')) {
        return;
      }

      try {
        await deleteFinding(findingId);
        toast.success('Finding deleted');
        mutate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete finding');
      }
    },
    [deleteFinding, mutate],
  );

  const openFindingsCount = scopeFilteredFindings.filter(
    (f: Finding) => f.status === FindingStatus.open || f.status === FindingStatus.needs_revision,
  ).length;

  const handleScopeFilterChange = useCallback((value: string | null) => {
    if (value == null || value === SCOPE_FILTER_ALL) {
      setScopeFilter(SCOPE_FILTER_ALL);
    } else {
      setScopeFilter(value as FindingScope);
    }
    setShowAll(false);
    setExpandedId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        <WarningAlt size={20} className="mr-2" />
        <span>Failed to load findings</span>
      </div>
    );
  }

  return (
    <div
      id="people-findings"
      className="rounded-lg border border-border bg-card overflow-hidden scroll-mt-6"
    >
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <WarningAltFilled size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Findings</h3>
              <p className="text-xs text-muted-foreground">
                Audit findings and issues requiring attention
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {openFindingsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900/50">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700 dark:text-red-400">
                  {openFindingsCount} requires action
                </span>
              </div>
            )}

            {canCreateFinding && (
              <CreateFindingButton showScope={true} onSuccess={() => mutate()} />
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        {rawFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <WarningAltFilled size={40} className="mb-3 opacity-50" />
            <p className="text-sm">No findings for this area</p>
            {canCreateFinding && (
              <p className="text-xs mt-1">Create a finding to flag an issue</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex w-full sm:justify-end">
              <div className="w-full sm:w-auto sm:min-w-56">
                <Select value={scopeFilter} onValueChange={handleScopeFilterChange}>
                  <SelectTrigger>
                    {scopeFilter === SCOPE_FILTER_ALL
                      ? 'All'
                      : FINDING_SCOPE_LABELS[scopeFilter]}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SCOPE_FILTER_ALL}>All</SelectItem>
                    {Object.entries(FINDING_SCOPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sortedFindings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <WarningAltFilled size={40} className="mb-3 opacity-50" />
                <p className="text-sm">No findings for this scope</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleFindings.map((finding: Finding) => (
                  <FindingItem
                    key={finding.id}
                    finding={finding}
                    isExpanded={expandedId === finding.id}
                    canChangeStatus={canChangeStatus}
                    canSetRestrictedStatus={canSetRestrictedStatus}
                    canSetReadyForReview={isPlatformAdmin || !isAuditor}
                    canDelete={canDeleteFinding}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === finding.id ? null : finding.id)
                    }
                    onStatusChange={(status, revisionNote) =>
                      handleStatusChange(finding.id, status, revisionNote)
                    }
                    onDelete={() => handleDelete(finding.id)}
                    onViewHistory={onViewHistory ? () => onViewHistory(finding.id) : undefined}
                  />
                ))}

                {sortedFindings.length > INITIAL_DISPLAY_COUNT && (
                  <div className="mt-2 text-muted-foreground hover:text-foreground">
                    <Button
                      variant="ghost"
                      size="sm"
                      width="full"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? (
                        <>
                          <ChevronUp size={16} className="mr-1.5" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown size={16} className="mr-1.5" />
                          Show {hiddenCount} more {hiddenCount === 1 ? 'finding' : 'findings'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
