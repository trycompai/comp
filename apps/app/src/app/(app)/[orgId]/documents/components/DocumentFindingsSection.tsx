'use client';

import { useFindingActions, useSubmissionFindings, type Finding } from '@/hooks/use-findings-api';
import { Button } from '@comp/ui/button';
import { FindingStatus } from '@db';
import { AlertTriangle, ChevronDown, ChevronUp, FileWarning, Loader2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CreateFindingButton } from '../../tasks/[taskId]/components/findings/CreateFindingButton';
import { FindingItem } from '../../tasks/[taskId]/components/findings/FindingItem';

const INITIAL_DISPLAY_COUNT = 5;

const STATUS_ORDER: Record<FindingStatus, number> = {
  [FindingStatus.open]: 0,
  [FindingStatus.needs_revision]: 1,
  [FindingStatus.ready_for_review]: 2,
  [FindingStatus.closed]: 3,
};

interface DocumentFindingsSectionProps {
  submissionId: string;
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isAdminOrOwner: boolean;
}

export function DocumentFindingsSection({
  submissionId,
  isAuditor,
  isPlatformAdmin,
  isAdminOrOwner,
}: DocumentFindingsSectionProps) {
  const { data, isLoading, error, mutate } = useSubmissionFindings(submissionId);
  const { updateFinding, deleteFinding } = useFindingActions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const rawFindings = data?.data || [];

  const sortedFindings = useMemo(() => {
    return [...rawFindings].sort((a: Finding, b: Finding) => {
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [rawFindings]);

  const visibleFindings = showAll ? sortedFindings : sortedFindings.slice(0, INITIAL_DISPLAY_COUNT);
  const hiddenCount = sortedFindings.length - visibleFindings.length;

  const canCreateFinding = isAuditor || isPlatformAdmin;
  const canChangeStatus = isAuditor || isPlatformAdmin || isAdminOrOwner;
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
      } catch (findingError) {
        toast.error(findingError instanceof Error ? findingError.message : 'Failed to update status');
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
      } catch (findingError) {
        toast.error(findingError instanceof Error ? findingError.message : 'Failed to delete finding');
      }
    },
    [deleteFinding, mutate],
  );

  const openFindingsCount = sortedFindings.filter(
    (finding: Finding) =>
      finding.status === FindingStatus.open || finding.status === FindingStatus.needs_revision,
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
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
            {canCreateFinding && (
              <CreateFindingButton
                evidenceSubmissionId={submissionId}
                onSuccess={() => {
                  mutate();
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        {sortedFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FileWarning className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No findings for this submission</p>
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
                canChangeStatus={canChangeStatus}
                canSetRestrictedStatus={canSetRestrictedStatus}
                onToggleExpand={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                onStatusChange={(status, revisionNote) =>
                  handleStatusChange(finding.id, status, revisionNote)
                }
                onDelete={() => handleDelete(finding.id)}
              />
            ))}

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
