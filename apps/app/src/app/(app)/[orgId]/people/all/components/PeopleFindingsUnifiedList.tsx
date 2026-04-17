'use client';

import {
  useFindingActions,
  useScopeFindings,
  type Finding,
} from '@/hooks/use-findings-api';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@trycompai/design-system';
import {
  ChevronDown,
  ChevronUp,
  WarningAlt,
  WarningAltFilled,
} from '@trycompai/design-system/icons';
import { FindingScope, FindingStatus } from '@db';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CreateFindingSheet,
  type FindingScopeOption,
} from '../../../tasks/[taskId]/components/findings/CreateFindingSheet';
import { FindingHistoryPanel } from '../../../tasks/[taskId]/components/findings/FindingHistoryPanel';
import { FindingItem } from '../../../tasks/[taskId]/components/findings/FindingItem';

const INITIAL_DISPLAY_COUNT = 5;

const PEOPLE_SCOPES: FindingScope[] = [
  FindingScope.people,
  FindingScope.people_tasks,
  FindingScope.people_devices,
  FindingScope.people_chart,
];

const SCOPE_LABELS: Record<FindingScope, string> = {
  [FindingScope.people]: 'Directory',
  [FindingScope.people_tasks]: 'Tasks',
  [FindingScope.people_devices]: 'Devices',
  [FindingScope.people_chart]: 'Chart',
};

const STATUS_ORDER: Record<FindingStatus, number> = {
  [FindingStatus.open]: 0,
  [FindingStatus.needs_revision]: 1,
  [FindingStatus.ready_for_review]: 2,
  [FindingStatus.closed]: 3,
};

interface PeopleFindingsUnifiedListProps {
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
  showTasksScope: boolean;
}

export function PeopleFindingsUnifiedList({
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
  showTasksScope,
}: PeopleFindingsUnifiedListProps) {
  const directory = useScopeFindings(FindingScope.people);
  const tasks = useScopeFindings(showTasksScope ? FindingScope.people_tasks : null);
  const devices = useScopeFindings(FindingScope.people_devices);
  const chart = useScopeFindings(FindingScope.people_chart);

  const { updateFinding, deleteFinding } = useFindingActions();
  const { hasPermission } = usePermissions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [historyFindingId, setHistoryFindingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const revalidate = useCallback(() => {
    directory.mutate();
    tasks.mutate();
    devices.mutate();
    chart.mutate();
  }, [directory, tasks, devices, chart]);

  const isLoading =
    directory.isLoading ||
    (showTasksScope && tasks.isLoading) ||
    devices.isLoading ||
    chart.isLoading;
  const error = directory.error || tasks.error || devices.error || chart.error;

  const allFindings = useMemo(() => {
    const lists = [directory.data?.data, tasks.data?.data, devices.data?.data, chart.data?.data];
    return lists.flatMap((l) => (Array.isArray(l) ? l : []));
  }, [directory.data, tasks.data, devices.data, chart.data]);

  const sortedFindings = useMemo(() => {
    return [...allFindings].sort((a: Finding, b: Finding) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [allFindings]);

  const visibleFindings = showAll
    ? sortedFindings
    : sortedFindings.slice(0, INITIAL_DISPLAY_COUNT);
  const hiddenCount = sortedFindings.length - visibleFindings.length;

  const openFindingsCount = sortedFindings.filter(
    (f: Finding) => f.status === FindingStatus.open || f.status === FindingStatus.needs_revision,
  ).length;

  const canCreateFinding = hasPermission('finding', 'create') && (isAuditor || isPlatformAdmin);
  const canUpdateFinding = hasPermission('finding', 'update');
  const canDeleteFinding = hasPermission('finding', 'delete');
  const canChangeStatus = canUpdateFinding || isAuditor || isPlatformAdmin || isAdminOrOwner;
  const canSetRestrictedStatus = isAuditor || isPlatformAdmin;

  const createScopeOptions: FindingScopeOption[] = PEOPLE_SCOPES.filter(
    (s) => s !== FindingScope.people_tasks || showTasksScope,
  ).map((s) => ({ value: s, label: SCOPE_LABELS[s] }));

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
        revalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status');
      }
    },
    [updateFinding, revalidate],
  );

  const handleDelete = useCallback(
    async (findingId: string) => {
      if (!confirm('Are you sure you want to delete this finding?')) return;
      try {
        await deleteFinding(findingId);
        toast.success('Finding deleted');
        revalidate();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete finding');
      }
    },
    [deleteFinding, revalidate],
  );

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
    <>
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
                  Audit findings across the people area
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {openFindingsCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 border border-red-100 dark:bg-red-950/30 dark:border-red-900/50">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">
                    {openFindingsCount} {openFindingsCount === 1 ? 'requires' : 'require'} action
                  </span>
                </div>
              )}

              {canCreateFinding && (
                <Button
                  variant="default"
                  size="icon-sm"
                  title="Create Finding"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-5">
          {sortedFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <WarningAltFilled size={40} className="mb-3 opacity-50" />
              <p className="text-sm">No findings for the people area</p>
              {canCreateFinding && (
                <p className="text-xs mt-1">Create a finding to flag an issue</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleFindings.map((finding: Finding) => (
                <div key={finding.id} className="space-y-1">
                  {finding.scope && (
                    <span className="inline-block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {SCOPE_LABELS[finding.scope] ?? finding.scope}
                    </span>
                  )}
                  <FindingItem
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
                    onViewHistory={() => setHistoryFindingId(finding.id)}
                  />
                </div>
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
        </div>
      </div>

      <CreateFindingSheet
        scopeOptions={createScopeOptions}
        scopeLabel="Area"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={revalidate}
      />


      {historyFindingId && (
        <FindingHistoryPanel
          findingId={historyFindingId}
          onClose={() => setHistoryFindingId(null)}
        />
      )}
    </>
  );
}
