'use client';

import type { Finding } from '@/hooks/use-findings-api';
import { FINDING_TYPE_LABELS } from '@/hooks/use-findings-api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Textarea } from '@comp/ui/textarea';
import { FindingStatus, FindingType } from '@db';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FindingHistorySheet } from './FindingHistorySheet';
import { FindingStatusBadge } from './FindingStatusBadge';

// Character threshold for showing "Read more" - approximate 2 lines
const CONTENT_TRUNCATE_LENGTH = 150;

interface FindingItemProps {
  finding: Finding;
  isExpanded: boolean;
  canChangeStatus: boolean;
  canSetRestrictedStatus: boolean;
  isAuditor: boolean;
  isPlatformAdmin: boolean;
  isTarget?: boolean; // Whether this finding is the navigation target
  onToggleExpand: () => void;
  onStatusChange: (status: FindingStatus, revisionNote?: string) => void;
  onDelete: () => void;
  onViewHistory?: () => void;
}

// How long to show the highlight (in ms)
const HIGHLIGHT_DURATION = 2000;

export function FindingItem({
  finding,
  isExpanded,
  canChangeStatus,
  canSetRestrictedStatus,
  isAuditor,
  isPlatformAdmin,
  isTarget = false,
  onToggleExpand,
  onStatusChange,
  onDelete,
  onViewHistory,
}: FindingItemProps) {
  // Only use local state for sheet if onViewHistory is not provided
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll to center and show highlight when this is the target finding
  useEffect(() => {
    if (isTarget && itemRef.current) {
      // Show highlight immediately
      setShowHighlight(true);

      // Scroll to center after a small delay
      const scrollTimer = setTimeout(() => {
        itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);

      // Fade out highlight after duration
      const highlightTimer = setTimeout(() => {
        setShowHighlight(false);
      }, HIGHLIGHT_DURATION);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(highlightTimer);
      };
    }
  }, [isTarget]);

  // Check if content is long enough to need truncation
  const needsTruncation = finding.content.length > CONTENT_TRUNCATE_LENGTH;

  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      setHistoryOpen(true);
    }
  };

  // Handle status selection - show dialog for "Needs Revision"
  const handleStatusSelect = (status: FindingStatus) => {
    if (status === FindingStatus.needs_revision) {
      setRevisionDialogOpen(true);
    } else {
      onStatusChange(status);
    }
  };

  // Skip adding a note - just change status
  const handleRevisionSkip = () => {
    onStatusChange(FindingStatus.needs_revision);
    setRevisionDialogOpen(false);
  };

  // Submit revision status with note
  const handleRevisionSubmit = () => {
    onStatusChange(FindingStatus.needs_revision, revisionNote.trim() || undefined);
    setRevisionDialogOpen(false);
    setRevisionNote('');
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
  const statusOptions = useMemo(() => {
    const canSetReadyForReview = isPlatformAdmin || !isAuditor;

    return [
      { value: FindingStatus.open, label: 'Open', disabled: false },
      {
        value: FindingStatus.ready_for_review,
        label: 'Ready for Review',
        disabled: !canSetReadyForReview,
        hint: !canSetReadyForReview ? 'Client only' : undefined,
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
  }, [isPlatformAdmin, isAuditor, canSetRestrictedStatus]);

  return (
    <div
      ref={itemRef}
      id={`finding-${finding.id}`}
      className={cn(
        'rounded-lg border transition-all duration-500',
        showHighlight
          ? 'border-primary shadow-md bg-primary/5 ring-2 ring-primary/20'
          : isExpanded
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

          {/* Content - show full or truncated based on expansion state */}
          <div className="mt-2">
            {isExpanded || !needsTruncation ? (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{finding.content}</p>
            ) : (
              <p className="text-sm text-foreground/90">
                {finding.content.slice(0, CONTENT_TRUNCATE_LENGTH).trim()}...
              </p>
            )}

            {/* Show expand/collapse toggle only when content is long */}
            {needsTruncation && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="mt-1 text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    Show less
                    <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Read more
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}

            {/* Auditor Note - displayed when status is needs_revision and note exists */}
            {finding.status === FindingStatus.needs_revision && finding.revisionNote && (
              <div className="mt-3 p-3 rounded-md bg-orange-50 border border-orange-200">
                <p className="text-xs font-medium text-orange-700 mb-1">Auditor Note</p>
                <p className="text-sm text-orange-900">{finding.revisionNote}</p>
              </div>
            )}
          </div>
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
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    disabled={option.disabled || finding.status === option.value}
                    onClick={() => handleStatusSelect(option.value)}
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
              <DropdownMenuItem onClick={handleViewHistory}>History</DropdownMenuItem>
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

      {/* Revision Note Dialog */}
      <Dialog
        open={revisionDialogOpen}
        onOpenChange={(open) => {
          setRevisionDialogOpen(open);
          if (!open) setRevisionNote('');
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Add a note explaining what needs to be revised, or skip to change the status without a
              note.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Please provide clearer screenshots showing the timestamp..."
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={handleRevisionSkip} className="sm:mr-auto">
              Skip
            </Button>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRevisionSubmit} disabled={!revisionNote.trim()}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
