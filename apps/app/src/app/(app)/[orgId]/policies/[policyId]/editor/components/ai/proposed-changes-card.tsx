'use client';

import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Input } from '@trycompai/design-system';
import { Checkmark, ChevronDown, ChevronUp, Close, Edit, MagicWand, Undo } from '@trycompai/design-system/icons';
import { parseDiff, type File, type Hunk, type Line, type LineSegment } from '@comp/ui/diff/utils/index';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ProposedChangesCardProps {
  patch: string;
  originalText: string;
  onApplySelected: (selectedHunkIndices: number[]) => void;
  onApplyAll: () => void;
  onDismiss: () => void;
  isApplying?: boolean;
  onHunkFeedback?: (hunkIndex: number, feedback: string) => void;
  feedbackHunkIndex?: number | null;
}

type HunkDecision = 'pending' | 'accepted' | 'rejected';

export function ProposedChangesCard({
  patch,
  originalText,
  onApplySelected,
  onApplyAll,
  onDismiss,
  isApplying,
  onHunkFeedback,
  feedbackHunkIndex,
}: ProposedChangesCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [file] = parseDiff(patch);
  const originalLines = useMemo(() => originalText.split('\n'), [originalText]);

  // Track decisions per hunk (only for actual hunks, not skip blocks)
  const hunkIndices = useMemo(() => {
    if (!file) return [];
    return file.hunks
      .map((h, i) => (h.type === 'hunk' && hunkHasChanges(h) ? i : -1))
      .filter((i) => i !== -1);
  }, [file]);

  const [decisions, setDecisions] = useState<Record<number, HunkDecision>>({});

  // Remap decisions when patch changes (e.g. after per-hunk feedback)
  const prevPatchRef = useRef(patch);

  useEffect(() => {
    if (prevPatchRef.current === patch) return;

    const oldPatch = prevPatchRef.current;
    prevPatchRef.current = patch;

    const [oldFile] = parseDiff(oldPatch);
    if (!oldFile || Object.keys(decisions).length === 0) return;

    const oldHunks = oldFile.hunks;
    const newHunks = file?.hunks ?? [];

    const remapped: Record<number, HunkDecision> = {};

    for (const [oldIdxStr, decision] of Object.entries(decisions)) {
      const oldIdx = Number(oldIdxStr);
      const oldHunk = oldHunks[oldIdx];
      if (!oldHunk || oldHunk.type !== 'hunk') continue;

      const newIdx = newHunks.findIndex(
        (h) => h.type === 'hunk' && h.oldStart === oldHunk.oldStart,
      );
      if (newIdx === -1) continue;

      const newHunk = newHunks[newIdx];
      if (!newHunk || newHunk.type !== 'hunk') continue;

      const oldContent = oldHunk.lines.map((l) => l.content.map((s) => s.value).join('')).join('');
      const newContent = newHunk.lines.map((l) => l.content.map((s) => s.value).join('')).join('');

      if (oldContent === newContent) {
        remapped[newIdx] = decision;
      }
    }

    setDecisions(remapped);
  }, [patch]);

  const getDecision = useCallback(
    (index: number): HunkDecision => decisions[index] ?? 'pending',
    [decisions],
  );

  const setDecision = useCallback((index: number, decision: HunkDecision) => {
    setDecisions((prev) => ({ ...prev, [index]: decision }));
  }, []);

  const acceptAll = useCallback(() => {
    const next: Record<number, HunkDecision> = {};
    for (const i of hunkIndices) next[i] = 'accepted';
    setDecisions(next);
  }, [hunkIndices]);

  const rejectAll = useCallback(() => {
    const next: Record<number, HunkDecision> = {};
    for (const i of hunkIndices) next[i] = 'rejected';
    setDecisions(next);
  }, [hunkIndices]);

  if (!file) return null;

  const changeCount = countChanges(file);
  if (changeCount === 0) return null;

  const hasAnyDecision = Object.keys(decisions).length > 0;
  const acceptedIndices = hunkIndices.filter((i) => getDecision(i) === 'accepted');
  const pendingIndices = hunkIndices.filter((i) => getDecision(i) === 'pending');
  const allDecided = pendingIndices.length === 0 && hasAnyDecision;

  const skipRanges = buildSkipRanges(file);

  // Build a display list that merges adjacent skip blocks and no-change hunks
  const displayItems = useMemo(() => {
    type DisplayItem =
      | { type: 'hunk'; index: number; hunk: Hunk }
      | { type: 'skip'; totalLines: number; startLine: number; endLine: number };

    const items: DisplayItem[] = [];
    let pendingSkipLines = 0;
    let skipStart = 1;
    let skipEnd = 0;

    const flushSkip = () => {
      if (pendingSkipLines > 0) {
        items.push({ type: 'skip', totalLines: pendingSkipLines, startLine: skipStart, endLine: skipEnd });
        pendingSkipLines = 0;
      }
    };

    for (let i = 0; i < file.hunks.length; i++) {
      const hunk = file.hunks[i];
      if (!hunk) continue;

      if (hunk.type === 'skip') {
        const range = skipRanges.get(i);
        if (range) {
          if (pendingSkipLines === 0) skipStart = range.start;
          skipEnd = range.end;
          pendingSkipLines += range.end - range.start + 1;
        }
      } else if (hunk.type === 'hunk' && !hunkHasChanges(hunk)) {
        // No-change hunk — count its lines as skipped
        if (pendingSkipLines === 0) skipStart = hunk.oldStart;
        skipEnd = hunk.oldStart + hunk.oldLines - 1;
        pendingSkipLines += hunk.oldLines;
      } else if (hunk.type === 'hunk') {
        flushSkip();
        items.push({ type: 'hunk', index: i, hunk });
      }
    }
    flushSkip();

    return items;
  }, [file, skipRanges]);

  // Click-to-confirm for unreviewed "Apply All"
  const [confirmingApplyAll, setConfirmingApplyAll] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const handleApply = () => {
    if (hasAnyDecision && acceptedIndices.length > 0) {
      onApplySelected(acceptedIndices);
      return;
    }

    // No changes reviewed — require confirmation
    if (!confirmingApplyAll) {
      setConfirmingApplyAll(true);
      confirmTimerRef.current = setTimeout(() => setConfirmingApplyAll(false), 3000);
      return;
    }

    setConfirmingApplyAll(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    onApplyAll();
  };

  const applyLabel = confirmingApplyAll
    ? `Apply all ${changeCount} changes?`
    : !hasAnyDecision
      ? 'Apply All'
      : acceptedIndices.length === hunkIndices.length
        ? 'Apply All'
        : `Apply ${acceptedIndices.length} ${acceptedIndices.length === 1 ? 'Change' : 'Changes'}`;

  const canApply = !hasAnyDecision || acceptedIndices.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        {/* Primary header bar */}
        <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
          <div className="flex items-center gap-2">
            <MagicWand size={14} />
            <span className="text-sm font-semibold">Suggested Changes</span>
            <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px] font-medium">
              {changeCount} {changeCount === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CollapsibleTrigger>
              <div className="rounded-md p-1 text-primary-foreground/70 hover:text-primary-foreground">
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </CollapsibleTrigger>
            <div className="[&_button]:text-primary-foreground/70 [&_button:hover]:text-primary-foreground">
              <Button variant="ghost" size="icon" onClick={onDismiss} iconLeft={<Close size={14} />} />
            </div>
          </div>
        </div>

        <CollapsibleContent>
          {/* Accept All / Reject All quick actions */}
          <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-1.5">
            <span className="text-xs text-muted-foreground">
              Review each change or apply all at once
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={acceptAll}>
                Accept all
              </Button>
              <span className="text-muted-foreground/30">|</span>
              <Button variant="ghost" size="sm" onClick={rejectAll}>
                Reject all
              </Button>
            </div>
          </div>

          {/* Inline diff body — scrollable */}
          <div className="max-h-[400px] divide-y divide-border/50 overflow-y-auto">
            {displayItems.map((item, idx) => {
              if (item.type === 'hunk') {
                const i = item.index;
                return (
                  <HunkWithActions
                    key={`hunk-${i}`}
                    hunk={item.hunk}
                    decision={getDecision(i)}
                    onAccept={() => setDecision(i, 'accepted')}
                    onReject={() => setDecision(i, 'rejected')}
                    onReset={() => setDecision(i, 'pending')}
                    onFeedback={onHunkFeedback ? (feedback: string) => onHunkFeedback(i, feedback) : undefined}
                    isLoading={feedbackHunkIndex === i}
                  />
                );
              }
              return (
                <ExpandableSkipSection
                  key={`skip-${idx}`}
                  count={item.totalLines}
                  lines={originalLines.slice(item.startLine - 1, item.endLine).join('\n')}
                />
              );
            })}
          </div>

          {/* Footer with actions */}
          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {hasAnyDecision && acceptedIndices.length > 0 && (
                <span>{acceptedIndices.length} of {hunkIndices.length} selected</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={confirmingApplyAll ? 'outline' : 'default'}
                onClick={handleApply}
                disabled={isApplying || !canApply}
                loading={isApplying}
                iconLeft={!isApplying ? <Checkmark size={12} /> : undefined}
              >
                {applyLabel}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function HunkWithActions({
  hunk,
  decision,
  onAccept,
  onReject,
  onReset,
  onFeedback,
  isLoading,
}: {
  hunk: Hunk;
  decision: HunkDecision;
  onAccept: () => void;
  onReject: () => void;
  onReset: () => void;
  onFeedback?: (feedback: string) => void;
  isLoading?: boolean;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const visibleLines = hunk.lines.filter(
    (line) => line.type === 'normal' || hasContent(line),
  );

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="space-y-2.5">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-5/6 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Rewriting this section...</div>
      </div>
    );
  }

  const isAccepted = decision === 'accepted';
  const isRejected = decision === 'rejected';
  const isPending = decision === 'pending';

  return (
    <div
      className={
        isAccepted
          ? 'relative border-l-2 border-l-primary bg-primary/5'
          : isRejected
            ? 'relative border-l-2 border-l-destructive/30 opacity-50'
            : 'relative'
      }
    >
      <div className="px-4 py-3 pr-20 text-sm leading-relaxed">
        {visibleLines.map((line, i) => (
          <InlineLine key={i} line={line} />
        ))}
      </div>

      {/* Accept / Reject / Feedback — compact icon buttons, always visible */}
      <div className="absolute right-2 top-2 flex items-center rounded-md border border-border/50 bg-background shadow-sm overflow-hidden">
        {isPending ? (
          <>
            <div className={`[&_button]:rounded-none [&_button]:rounded-l-md [&_button:hover]:bg-primary [&_button:hover]:text-primary-foreground`}>
              <Button variant="ghost" size="icon" onClick={onAccept} iconLeft={<Checkmark size={14} />} />
            </div>
            <div className={`[&_button]:rounded-none ${onFeedback ? '' : '[&_button]:rounded-r-md'} [&_button:hover]:bg-destructive [&_button:hover]:text-destructive-foreground`}>
              <Button variant="ghost" size="icon" onClick={onReject} iconLeft={<Close size={14} />} />
            </div>
            {onFeedback && (
              <div className="[&_button]:rounded-none [&_button]:rounded-r-md [&_button:hover]:bg-muted">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFeedback((prev) => !prev)}
                  iconLeft={<Edit size={14} />}
                />
              </div>
            )}
          </>
        ) : (
          <Button
            variant={isAccepted ? 'default' : 'destructive'}
            size="sm"
            onClick={onReset}
            iconLeft={<Undo size={12} />}
          >
            Undo
          </Button>
        )}
      </div>

      {showFeedback && (
        <div className="border-t border-border/30 bg-muted/10 px-3 py-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (feedbackText.trim() && onFeedback) {
                onFeedback(feedbackText.trim());
                setFeedbackText('');
                setShowFeedback(false);
              }
            }}
            className="flex items-center gap-2"
          >
            <div className="flex-1">
              <Input
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What should change?"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowFeedback(false);
                    setFeedbackText('');
                  }
                }}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!feedbackText.trim()}
            >
              Send
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

function ExpandableSkipSection({ count, lines }: { count: number; lines: string }) {
  const [expanded, setExpanded] = useState(false);
  const strippedText = stripMarkdown(lines).trim();

  if (!strippedText) {
    return (
      <div className="px-4 py-1.5 text-center text-xs italic text-muted-foreground/60">
        {count} unchanged {count === 1 ? 'line' : 'lines'}
      </div>
    );
  }

  return (
    <div className="border-y border-dashed border-border/30">
      <div className="flex justify-center [&_button]:text-muted-foreground/60 [&_button:hover]:text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          iconLeft={expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        >
          {expanded ? 'Hide' : 'Show'} {count} unchanged {count === 1 ? 'line' : 'lines'}
        </Button>
      </div>
      {expanded && (
        <div className="border-t border-dashed border-border/30 bg-muted/10 px-4 py-3 text-sm leading-relaxed text-muted-foreground/70">
          {strippedText}
        </div>
      )}
    </div>
  );
}

function InlineLine({ line }: { line: Line }) {
  const hasInlineChanges = line.content.some((seg) => seg.type !== 'normal');

  if (hasInlineChanges) {
    return (
      <span>
        {line.content.map((segment, i) => (
          <InlineSegment key={i} segment={segment} />
        ))}
      </span>
    );
  }

  const text = stripMarkdown(line.content.map((seg) => seg.value).join(''));
  if (!text) return null;

  if (line.type === 'insert') {
    return (
      <span className="rounded-sm bg-primary/25 px-0.5 font-medium text-primary">
        {text}
      </span>
    );
  }
  if (line.type === 'delete') {
    return (
      <span className="rounded-sm bg-destructive/20 px-0.5 text-destructive line-through decoration-destructive/50">
        {text}
      </span>
    );
  }

  return <span className="text-foreground/70">{text} </span>;
}

function InlineSegment({ segment }: { segment: LineSegment }) {
  const text = stripMarkdown(segment.value);
  if (!text) return null;

  if (segment.type === 'delete') {
    return (
      <span className="rounded-sm bg-destructive/20 px-0.5 text-destructive line-through decoration-destructive/50">
        {text}
      </span>
    );
  }
  if (segment.type === 'insert') {
    return (
      <span className="rounded-sm bg-primary/25 px-0.5 font-medium text-primary">
        {text}
      </span>
    );
  }
  return <span className="text-foreground/70">{text}</span>;
}

/**
 * Strip markdown syntax so diffs read as plain prose.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
    .replace(/_{1,3}(.*?)_{1,3}/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[-*_]{3,}\s*$/gm, '');
}

function hasContent(line: Line): boolean {
  const text = line.content.map((seg) => seg.value).join('').trim();
  return text.length > 0;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function hunkHasChanges(hunk: Hunk): boolean {
  if (hunk.type !== 'hunk') return false;

  const lines = hunk.lines;

  // Check for inline diff segments (merged delete+insert with visible changes)
  for (const line of lines) {
    if (line.content.some((s) => s.type !== 'normal')) return true;
  }

  // Check for unpaired inserts/deletes, but skip delete+insert pairs with identical/whitespace-only text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.type === 'delete') {
      const next = lines[i + 1];
      if (next?.type === 'insert') {
        const delText = normalizeText(line.content.map((s) => s.value).join(''));
        const insText = normalizeText(next.content.map((s) => s.value).join(''));
        if (delText !== insText) return true;
        i++; // skip the insert
      } else {
        // Unpaired delete — only count if it has non-whitespace content
        const text = normalizeText(line.content.map((s) => s.value).join(''));
        if (text.length > 0) return true;
      }
    } else if (line.type === 'insert') {
      // Unpaired insert — only count if it has non-whitespace content
      const text = normalizeText(line.content.map((s) => s.value).join(''));
      if (text.length > 0) return true;
    }
  }

  return false;
}

function countChanges(file: File): number {
  let count = 0;
  for (const hunk of file.hunks) {
    if (hunk.type === 'hunk' && hunkHasChanges(hunk)) {
      count++;
    }
  }
  return count;
}

function buildSkipRanges(file: File): Map<number, { start: number; end: number }> {
  const ranges = new Map<number, { start: number; end: number }>();
  let lastHunkEnd = 1;

  for (let i = 0; i < file.hunks.length; i++) {
    const hunk = file.hunks[i];
    if (!hunk) continue;

    if (hunk.type === 'skip') {
      const nextHunk = file.hunks[i + 1];
      if (nextHunk && nextHunk.type === 'hunk') {
        ranges.set(i, { start: lastHunkEnd, end: nextHunk.oldStart - 1 });
      } else {
        ranges.set(i, { start: lastHunkEnd, end: lastHunkEnd + hunk.count - 1 });
      }
    } else {
      lastHunkEnd = hunk.oldStart + hunk.oldLines;
    }
  }

  return ranges;
}

function getSkipLines(
  originalLines: string[],
  skipRanges: Map<number, { start: number; end: number }>,
  hunkIndex: number,
): string {
  const range = skipRanges.get(hunkIndex);
  if (!range) return '';
  return originalLines.slice(range.start - 1, range.end).join('\n');
}
