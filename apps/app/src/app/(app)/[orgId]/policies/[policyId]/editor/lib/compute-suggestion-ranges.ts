import { structuredPatch, diffWords } from 'diff';
import type { DiffSegment, PositionMap, SuggestionRange } from './suggestion-types';

export function computeSuggestionRanges(
  positionMap: PositionMap,
  proposedMarkdown: string,
): SuggestionRange[] {
  const { markdown: currentMarkdown, lineToPos } = positionMap;

  if (normalizeWhitespace(currentMarkdown) === normalizeWhitespace(proposedMarkdown)) {
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

    if (normalizeWhitespace(oldText) === normalizeWhitespace(newText)) {
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
      proposedText: newText,
      originalText: oldText,
      decision: 'pending',
    });
  }

  return mergeOverlappingRanges(ranges);
}

/**
 * Merge ranges whose [from, to] overlap or are identical.
 * When two ranges overlap, combine them into a single 'modify' range.
 */
function mergeOverlappingRanges(ranges: SuggestionRange[]): SuggestionRange[] {
  if (ranges.length <= 1) return ranges;

  // Sort by from position
  const sorted = [...ranges].sort((a, b) => a.from - b.from);
  const merged: SuggestionRange[] = [];

  for (const range of sorted) {
    const prev = merged[merged.length - 1];

    if (prev && range.from <= prev.to) {
      // Overlapping — merge into one modify range
      prev.to = Math.max(prev.to, range.to);
      prev.type = 'modify';
      prev.originalText = prev.originalText + '\n' + range.originalText;
      prev.proposedText = prev.proposedText + '\n' + range.proposedText;
      prev.segments = []; // Drop word-level segments for merged ranges
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

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
