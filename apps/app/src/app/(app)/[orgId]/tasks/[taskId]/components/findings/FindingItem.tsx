'use client';

import type { Finding } from '@/hooks/use-findings-api';
import { FINDING_TYPE_LABELS } from '@/hooks/use-findings-api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { FindingStatus, FindingType } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, MoreVertical, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FindingHistorySheet } from './FindingHistorySheet';
import { FindingStatusBadge } from './FindingStatusBadge';

interface FindingItemProps {
  finding: Finding;
  isExpanded: boolean;
  canChangeStatus: boolean;
  canSetRestrictedStatus: boolean;
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: FindingStatus) => void;
  onDelete: () => void;
  onViewHistory?: () => void;
}

export function FindingItem({
  finding,
  isExpanded,
  canChangeStatus,
  canSetRestrictedStatus,
  isAuditor,
  isPlatformAdmin,
  onToggleExpand,
  onStatusChange,
  onDelete,
  onViewHistory,
}: FindingItemProps) {
  // Only use local state for sheet if onViewHistory is not provided
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      setHistoryOpen(true);
    }
  };

  const author = finding.createdBy?.user;
  const initials =
    author?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  // Status options based on permissions
  // - Platform admins can set any status (full control)
  // - Auditors can set: open, needs_revision, closed
  // - Non-auditor admins/owners can set: open, ready_for_review
  const getStatusOptions = () => {
    // Platform admins bypass all restrictions
    const canSetReadyForReview = isPlatformAdmin || !isAuditor;
    const showReadyForReviewHint = !canSetReadyForReview;

    const options: { value: FindingStatus; label: string; disabled: boolean; hint?: string }[] = [
      { value: FindingStatus.open, label: 'Open', disabled: false },
      {
        value: FindingStatus.ready_for_review,
        label: 'Ready for Review',
        disabled: !canSetReadyForReview,
        hint: showReadyForReviewHint ? 'Client only' : undefined,
      },
      {
        value: FindingStatus.needs_revision,
        label: 'Needs Revision',
        disabled: !canSetRestrictedStatus,
        hint: !canSetRestrictedStatus ? 'Auditor only' : undefined,
      },
      {
        value: FindingStatus.closed,
        label: 'Closed',
        disabled: !canSetRestrictedStatus,
        hint: !canSetRestrictedStatus ? 'Auditor only' : undefined,
      },
    ];
    return options;
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-300',
        isExpanded
          ? 'border-primary/30 shadow-sm bg-primary/2'
          : 'border-border/50 hover:border-border hover:shadow-sm',
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={author?.image || undefined} alt={author?.name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{author?.name}</span>
            <Badge variant="outline" className="text-xs">
              {FINDING_TYPE_LABELS[finding.type as FindingType]}
            </Badge>
            <FindingStatusBadge status={finding.status as FindingStatus} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true })}
            {finding.template && (
              <span className="ml-1">
                · Template: <span className="text-foreground/70">{finding.template.title}</span>
              </span>
            )}
          </p>
          <p className="text-sm text-foreground/90 mt-2 line-clamp-2">{finding.content}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {canChangeStatus && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  Status
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {getStatusOptions().map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    disabled={option.disabled || finding.status === option.value}
                    onClick={() => onStatusChange(option.value)}
                    className={cn(
                      finding.status === option.value && 'bg-accent',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {option.label}
                    {option.hint && (
                      <span className="ml-2 text-xs text-muted-foreground">({option.hint})</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggleExpand}>
                {isExpanded ? 'Collapse' : 'Expand'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewHistory}>
                History
              </DropdownMenuItem>
              {canSetRestrictedStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Finding History Sheet - only used as fallback when onViewHistory is not provided */}
      {!onViewHistory && (
        <FindingHistorySheet
          findingId={finding.id}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />
      )}

      {/* Expanded content */}
      <div
        className={cn(
          'grid transition-all duration-500 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-border/50">
            <p className="text-sm text-foreground whitespace-pre-wrap">{finding.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
