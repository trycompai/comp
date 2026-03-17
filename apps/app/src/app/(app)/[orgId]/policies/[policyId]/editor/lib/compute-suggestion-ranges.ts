import { structuredPatch, diffWords } from 'diff';
import type { DiffSegment, PositionMap, SuggestionRange } from './suggestion-types';

export function computeSuggestionRanges(
  positionMap: PositionMap,
  proposedMarkdown: string,
): SuggestionRange[] {
  const { markdown: currentMarkdown, lineToPos } = positionMap;

  if (normalizeContent(currentMarkdown) === normalizeContent(proposedMarkdown)) {
    return [];
  }

  // Ensure both inputs end with a newline so the diff library
  // never generates "\ No newline at end of file" markers
  const normalizedCurrent = currentMarkdown.endsWith('\n') ? currentMarkdown : `${currentMarkdown}\n`;
  const normalizedProposed = proposedMarkdown.endsWith('\n') ? proposedMarkdown : `${proposedMarkdown}\n`;

  const patch = structuredPatch('policy', 'policy', normalizedCurrent, normalizedProposed, '', '', {
    context: 0,
  });

  const ranges: SuggestionRange[] = [];

  for (const hunk of patch.hunks) {
    const oldLines: string[] = [];
    const newLines: string[] = [];

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        oldLines.push(line.slice(1));
      } else if (line.startsWith('+')) {
        newLines.push(line.slice(1));
      } else {
        oldLines.push(line.startsWith(' ') ? line.slice(1) : line);
        newLines.push(line.startsWith(' ') ? line.slice(1) : line);
      }
    }

    const oldText = oldLines.join('\n');
    const newText = newLines.join('\n');

    // Skip hunks where the only difference is whitespace, punctuation tweaks,
    // or list marker formatting
    if (normalizeContent(oldText) === normalizeContent(newText)) {
      continue;
    }

    const positions = resolveHunkPositions(hunk.oldStart, hunk.oldLines, lineToPos);
    if (!positions) continue;

    const rangeType = classifyHunk(oldLines, newLines);
    const segments = rangeType === 'modify' ? computeWordDiff(oldText, newText) : [];

    ranges.push({
      id: `suggestion-${hunk.oldStart}-${hunk.newStart}`,
      type: rangeType,
      from: positions.from,
      to: positions.to,
      segments,
      proposedText: newText.trim(),
      originalText: oldText.trim(),
      decision: 'pending',
    });
  }

  return mergeOverlappingRanges(ranges);
}

/**
 * Merge ranges that overlap, are adjacent, or are close together.
 * The diff library splits section deletions into multiple hunks when
 * blank lines between them match as "unchanged context". Merging
 * nearby ranges of the same type fixes this.
 */
function mergeOverlappingRanges(ranges: SuggestionRange[]): SuggestionRange[] {
  if (ranges.length <= 1) return ranges;

  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: SuggestionRange[] = [];

  for (const range of sorted) {
    const prev = merged[merged.length - 1];

    if (!prev) {
      merged.push({ ...range });
      continue;
    }

    // Merge if overlapping or adjacent (gap of ≤20 positions, which covers
    // a few empty paragraphs / blank lines between hunks).
    // Always merge two adjacent deletes — they're almost certainly one section.
    const gap = range.from - prev.to;
    const shouldMerge =
      gap <= 0 || // overlapping
      (gap <= 20 && prev.type === range.type) || // same type, close together
      (gap <= 20 && prev.type === 'delete' && range.type === 'delete'); // adjacent deletes

    if (shouldMerge) {
      prev.to = Math.max(prev.to, range.to);
      prev.type = prev.type === range.type ? prev.type : 'modify';
      prev.originalText = prev.originalText + '\n' + range.originalText;
      prev.proposedText = prev.proposedText + '\n' + range.proposedText;
      prev.segments = [];
      prev.id = `suggestion-merged-${prev.from}-${prev.to}`;
    } else {
      merged.push({ ...range });
    }
  }

  return merged;
}

function classifyHunk(oldLines: string[], newLines: string[]): SuggestionRange['type'] {
  const hasOld = oldLines.some((l) => l.trim().length > 0);
  const hasNew = newLines.some((l) => l.trim().length > 0);
  if (hasOld && hasNew) return 'modify';
  if (!hasOld && hasNew) return 'insert';
  return 'delete';
}

function resolveHunkPositions(
  oldStart: number,
  oldLines: number,
  lineToPos: Map<number, { from: number; to: number }>,
): { from: number; to: number } | null {
  if (oldLines === 0) {
    const anchor = lineToPos.get(oldStart) ?? lineToPos.get(oldStart - 1);
    if (!anchor) return findNearestPosition(oldStart, lineToPos);
    return anchor;
  }

  let from: number | null = null;
  let to: number | null = null;

  for (let line = oldStart; line < oldStart + oldLines; line++) {
    const pos = lineToPos.get(line);
    if (pos) {
      if (from === null || pos.from < from) from = pos.from;
      if (to === null || pos.to > to) to = pos.to;
    }
  }

  if (from === null || to === null) {
    return findNearestPosition(oldStart, lineToPos);
  }

  return { from, to };
}

function findNearestPosition(
  targetLine: number,
  lineToPos: Map<number, { from: number; to: number }>,
): { from: number; to: number } | null {
  let closest: { from: number; to: number } | null = null;
  let closestDist = Infinity;
  for (const [line, pos] of lineToPos) {
    const dist = Math.abs(line - targetLine);
    if (dist < closestDist) {
      closestDist = dist;
      closest = pos;
    }
  }
  return closest;
}

function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const changes = diffWords(oldText, newText);
  return changes.map((change) => ({
    text: change.value,
    type: change.added ? 'insert' : change.removed ? 'delete' : 'unchanged',
  }));
}

/**
 * Aggressively normalize text for comparison:
 * - Strip list markers (- , * , 1. )
 * - Strip heading markers (# ## ### etc.)
 * - Collapse all whitespace
 * - Lowercase
 * This catches formatting-only diffs the AI introduces.
 */
function normalizeContent(text: string): string {
  return text
    .replace(/^[\s]*[-*]\s+/gm, '')    // strip list markers
    .replace(/^[\s]*#{1,6}\s+/gm, '')  // strip heading markers
    .replace(/^[\s]*>\s+/gm, '')       // strip blockquote markers
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
