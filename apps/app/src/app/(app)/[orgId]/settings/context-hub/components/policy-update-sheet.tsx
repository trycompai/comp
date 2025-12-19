'use client';

import { CheckCircle2, ChevronDown, ChevronRight, Clock3, FileText, Loader2, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@comp/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comp/ui/collapsible';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@comp/ui/sheet';

import type {
  AffectedPolicyInfo,
  PolicyDiff,
  PolicyUpdatePhase,
  PolicyUpdateStatus,
} from '../hooks/use-policy-update-realtime';

interface PolicyUpdateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: PolicyUpdateStatus;
}

export function PolicyUpdateSheet({ open, onOpenChange, status }: PolicyUpdateSheetProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const allPoliciesCompleted =
    status.affectedPoliciesInfo.length > 0 &&
    status.affectedPoliciesInfo.every(
      (p) => status.policiesStatus[p.id] === 'completed',
    );

  const countsComplete =
    status.policiesTotal > 0 &&
    status.policiesCompleted >= status.policiesTotal;

  const fullyDone = allPoliciesCompleted || countsComplete || status.isComplete;

  const phaseForDisplay: PolicyUpdatePhase =
    status.phase === 'analyzing'
      ? 'analyzing'
      : fullyDone
        ? 'completed'
        : 'updating';

  const getPhaseLabel = () => {
    switch (phaseForDisplay) {
      case 'analyzing':
        return 'Scanning policies...';
      case 'updating':
        return 'Updating policies...';
      case 'completed':
        return status.error ? 'Update failed' : 'Update complete';
      default:
        return 'Processing...';
    }
  };

  const getPhaseDescription = () => {
    switch (phaseForDisplay) {
      case 'analyzing':
        return `Checking ${status.analyzedCount}/${status.totalPolicies} policies for relevance`;
      case 'updating':
        return `${status.policiesCompleted}/${status.policiesTotal} policies processed`;
      case 'completed':
        if (status.error) {
          return 'An error occurred during the update process';
        }
        return status.affectedCount === 0
          ? 'No policies needed updating'
          : `${status.affectedCount} policies were processed`;
      default:
        return 'Please wait...';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent stack>
        <SheetHeader className="mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Policy Updates
            </SheetTitle>
            <Badge
              variant={
                phaseForDisplay === 'completed'
                  ? status.error
                    ? 'destructive'
                    : 'default'
                  : 'secondary'
              }
            >
              {getPhaseLabel()}
            </Badge>
          </div>
          <SheetDescription>{getPhaseDescription()}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {phaseForDisplay === 'analyzing' && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Scanning policy relevance</p>
                <p className="text-xs text-muted-foreground">
                  Found {status.affectedCount} policies that need updating
                </p>
              </div>
            </div>
          )}

          {status.affectedPoliciesInfo.length > 0 && (
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <h3 className="text-sm font-medium shrink-0">Affected Policies</h3>
              <ScrollArea className="flex-1 max-h-[calc(100vh-220px)]">
                  <div className="space-y-2 pr-4">
                    {status.affectedPoliciesInfo.map((policy) => {
                      const diff = status.policyDiffs.find((d) => d.policyId === policy.id);
                      return (
                        <PolicyListItem
                          key={policy.id}
                          policy={policy}
                          status={status.policiesStatus[policy.id] || 'pending'}
                          orgId={orgId}
                          diff={diff}
                          phase={phaseForDisplay}
                        />
                      );
                    })}
                  </div>
              </ScrollArea>
            </div>
          )}

          {phaseForDisplay === 'completed' && status.affectedPoliciesInfo.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">No policies affected</p>
              <p className="text-xs text-muted-foreground mt-1">
                The context change doesn't impact any of your policies
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface PolicyListItemProps {
  policy: AffectedPolicyInfo;
  status: 'pending' | 'processing' | 'completed';
  orgId: string;
  diff?: PolicyDiff;
  phase: PolicyUpdatePhase;
}

function PolicyListItem({ policy, status, orgId, diff, phase }: PolicyListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusLabel = () => {
    if (phase === 'analyzing') return 'Scanning...';
    if (status === 'pending') return 'Pending';
    if (status === 'processing') return 'Updating...';
    if (status === 'completed') {
      if (!diff || diff.sectionsModified.length === 0) return 'Not edited';
      return 'Patched by AI';
    }
    return 'Pending';
  };

  const statusLabel = getStatusLabel();
  const isPatchedByAI = statusLabel === 'Patched by AI';
  const isNotEdited = statusLabel === 'Not edited';

  const header = (
    <div className="flex flex-col gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        {status === 'completed' ? (
          isPatchedByAI ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-chart-positive" />
          ) : (
            <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : status === 'processing' ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={`text-sm ${
            status === 'completed' && isPatchedByAI
              ? 'text-foreground'
              : status === 'processing'
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
          }`}
        >
          {policy.name}
        </span>
      </div>
      <div className="flex items-center gap-2 ml-6">
        {diff && diff.sectionsModified.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {diff.sectionsModified.length} section{diff.sectionsModified.length > 1 ? 's' : ''}
          </Badge>
        )}
        <Badge
          variant={isPatchedByAI ? 'default' : isNotEdited ? 'secondary' : 'outline'}
          className="text-xs"
        >
          {statusLabel}
        </Badge>
        {diff && diff.sectionsModified.length > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (!diff || diff.sectionsModified.length === 0) {
    if (status === 'completed' && isPatchedByAI) {
      return (
        <Link href={`/${orgId}/policies/${policy.id}`} className="block">
          {header}
        </Link>
      );
    }
    return header;
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        {header}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 ml-6 p-3 rounded-lg bg-muted/30 text-xs space-y-3 max-h-[300px] overflow-y-auto">
          {diff.sectionsModified.length > 0 && (
            <div>
              <span className="font-medium text-muted-foreground">Modified sections:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {diff.sectionsModified.map((section, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs font-normal">
                    {section}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {diff.oldTextPreview && diff.newTextPreview && (
            <div className="space-y-2">
              <div>
                <span className="font-medium text-destructive block mb-1">− Removed:</span>
                <div className="p-2 rounded border border-destructive/30 bg-destructive/10 text-muted-foreground whitespace-pre-wrap">
                  {diff.oldTextPreview}
                </div>
              </div>
              <div>
                <span className="font-medium text-chart-positive block mb-1">+ Added:</span>
                <div className="p-2 rounded border border-chart-positive/30 bg-chart-positive/10 text-foreground whitespace-pre-wrap">
                  {diff.newTextPreview}
                </div>
              </div>
            </div>
          )}
          {status === 'completed' && (
            <Link
              href={`/${orgId}/policies/${policy.id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View policy →
            </Link>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
