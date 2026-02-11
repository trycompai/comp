'use client';

import { useFindingActions, useTaskFindings, type Finding } from '@/hooks/use-findings-api';
import { Button } from '@comp/ui/button';
import { FindingStatus } from '@db';
import { AlertTriangle, ChevronDown, ChevronUp, FileWarning, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreateFindingButton } from './CreateFindingButton';
import { FindingItem } from './FindingItem';
import { usePermissions } from '@/hooks/use-permissions';

// Number of findings to show initially
const INITIAL_DISPLAY_COUNT = 5;

interface FindingsListProps {
  taskId: string;
  // Role information for permission checks
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
  // Callback to view finding history in sidebar
  onViewHistory?: (findingId: string) => void;
}

// Status priority for sorting (lower = higher priority)
const STATUS_ORDER: Record<FindingStatus, number> = {
  [FindingStatus.open]: 0,
  [FindingStatus.needs_revision]: 1,
  [FindingStatus.ready_for_review]: 2,
  [FindingStatus.closed]: 3,
};

export function FindingsList({
  taskId,
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
  onViewHistory,
}: FindingsListProps) {
  const { data, isLoading, error, mutate } = useTaskFindings(taskId);
  const { updateFinding, deleteFinding } = useFindingActions();
  const { hasPermission } = usePermissions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [targetFindingId, setTargetFindingId] = useState<string | null>(null);

  // Detect target finding from URL hash (e.g., #finding-abc123)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash.startsWith('#finding-')) {
      const findingId = hash.replace('#finding-', '');
      setTargetFindingId(findingId);
      // Expand all findings so the target is visible
      setShowAll(true);

      // Clear the target after highlight duration so it returns to normal
      const timer = setTimeout(() => {
        setTargetFindingId(null);
        // Clean up the URL hash
        window.history.replaceState(null, '', window.location.pathname);
      }, 2500); // Slightly longer than highlight duration to ensure smooth transition

      return () => clearTimeout(timer);
    }
  }, []);

  const rawFindings = data?.data || [];

  // Sort findings: by status priority, then by updatedAt (most recently updated first)
  const sortedFindings = useMemo(() => {
    return [...rawFindings].sort((a: Finding, b: Finding) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [rawFindings]);

  // Determine visible findings based on showAll state
  const visibleFindings = showAll ? sortedFindings : sortedFindings.slice(0, INITIAL_DISPLAY_COUNT);
  const hiddenCount = sortedFindings.length - visibleFindings.length;

  // Permission checks - use RBAC permissions with role-based fallback
  const canCreateFinding = hasPermission('finding', 'create');
  const canUpdateFinding = hasPermission('finding', 'update');
  const canDeleteFinding = hasPermission('finding', 'delete');
  const canChangeStatus = canUpdateFinding || isAuditor || isPlatformAdmin || isAdminOrOwner;
  const canSetRestrictedStatus = isAuditor || isPlatformAdmin;

  const handleStatusChange = useCallback(
    async (findingId: string, status: FindingStatus, revisionNote?: string) => {
      try {
        const updateData: { status: FindingStatus; revisionNote?: string | null } = { status };

        // Only include revisionNote for needs_revision status
        if (status === FindingStatus.needs_revision && revisionNote) {
          updateData.revisionNote = revisionNote;
        }

        await updateFinding(findingId, updateData);
        toast.success(
          revisionNote ? 'Finding marked for revision with note' : 'Finding status updated',
        );
        mutate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update status');
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete finding');
      }
    },
    [deleteFinding, mutate],
  );

  // Count open findings for the alert
  const openFindingsCount = sortedFindings.filter(
    (f: Finding) => f.status === FindingStatus.open || f.status === FindingStatus.needs_revision,
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        <AlertTriangle className="h-5 w-5 mr-2" />
        <span>Failed to load findings</span>
      </div>
    );
  }

  return (
    <div
      id="findings"
      className="rounded-lg border border-border bg-card overflow-hidden scroll-mt-6"
    >
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <FileWarning className="h-4 w-4 text-primary" />
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 border border-red-100">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-700">
                  {openFindingsCount} requires action
                </span>
              </div>
            )}

            {canCreateFinding && <CreateFindingButton taskId={taskId} onSuccess={() => mutate()} />}
          </div>
        </div>
      </div>

      <div className="p-5">
        {sortedFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileWarning className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No findings for this task</p>
            {canCreateFinding && <p className="text-xs mt-1">Create a finding to flag an issue</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleFindings.map((finding: Finding) => (
              <FindingItem
                key={finding.id}
                finding={finding}
                isAuditor={isAuditor}
                isPlatformAdmin={isPlatformAdmin}
                isExpanded={expandedId === finding.id}
                isTarget={targetFindingId === finding.id}
                canChangeStatus={canChangeStatus}
                canSetRestrictedStatus={canSetRestrictedStatus}
                canDelete={canDeleteFinding}
                onToggleExpand={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                onStatusChange={(status, revisionNote) =>
                  handleStatusChange(finding.id, status, revisionNote)
                }
                onDelete={() => handleDelete(finding.id)}
                onViewHistory={onViewHistory ? () => onViewHistory(finding.id) : undefined}
              />
            ))}

            {/* Show more / Show less button */}
            {sortedFindings.length > INITIAL_DISPLAY_COUNT && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1.5" />
                    Show {hiddenCount} more {hiddenCount === 1 ? 'finding' : 'findings'}
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
