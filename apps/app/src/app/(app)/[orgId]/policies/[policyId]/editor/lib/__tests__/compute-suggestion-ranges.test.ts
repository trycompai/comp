import { describe, expect, it } from 'vitest';
import { computeSuggestionRanges } from '../compute-suggestion-ranges';
import type { PositionMap } from '../suggestion-types';

function makePositionMap(markdown: string): PositionMap {
  const lines = markdown.split('\n');
  const lineToPos = new Map<number, { from: number; to: number }>();
  let pos = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim()) {
      const from = pos;
      const to = pos + line.length;
      lineToPos.set(i + 1, { from, to });
    }
    pos += line.length + 1;
  }

  return { lineToPos, markdown };
}

describe('computeSuggestionRanges', () => {
  it('returns empty array for identical content', () => {
    const markdown = 'Hello world\nThis is a test';
    const posMap = makePositionMap(markdown);
    const ranges = computeSuggestionRanges(posMap, markdown);

    expect(ranges).toEqual([]);
  });

  it('detects a modification with word-level segments', () => {
    const original = 'The quick brown fox';
    const proposed = 'The slow brown fox';
    const posMap = makePositionMap(original);

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges).toHaveLength(1);
    expect(ranges[0].type).toBe('modify');
    expect(ranges[0].decision).toBe('pending');
    expect(ranges[0].segments.length).toBeGreaterThan(0);

    const deleteSegment = ranges[0].segments.find((s) => s.type === 'delete');
    const insertSegment = ranges[0].segments.find((s) => s.type === 'insert');
    expect(deleteSegment?.text).toContain('quick');
    expect(insertSegment?.text).toContain('slow');
  });

  it('detects an insertion', () => {
    const original = 'Line one\nLine three';
    const proposed = 'Line one\nLine two\nLine three';
    const posMap = makePositionMap(original);

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges).toHaveLength(1);
    // The hunk has both old content (empty) and new content, classified as insert or modify
    expect(ranges[0].proposedText).toContain('Line two');
  });

  it('detects a deletion', () => {
    const original = 'Line one\nLine two\nLine three';
    const proposed = 'Line one\nLine three';
    const posMap = makePositionMap(original);

    const ranges = computeSuggestionRanges(posMap, proposed);

    expect(ranges).toHaveLength(1);
    expect(ranges[0].originalText).toContain('Line two');
  });

  it('assigns unique IDs to each range', () => {
    const original = 'First line\nSecond line\nThird line';
    const proposed = 'Changed first\nSecond line\nChanged third';
    const posMap = makePositionMap(original);

    const ranges = computeSuggestionRanges(posMap, proposed);

    const ids = ranges.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('skips hunks with only whitespace changes', () => {
    const original = 'Hello world';
    const proposed = 'Hello  world';
    const posMap = makePositionMap(original);

    const ranges = computeSuggestionRanges(posMap, proposed);

    // normalizeWhitespace makes these equal at the top level
    expect(ranges).toEqual([]);
  });
});
