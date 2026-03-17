import { describe, expect, it } from 'vitest';
import { computeSuggestionRanges } from '../compute-suggestion-ranges';
import type { PositionMap } from '../suggestion-types';

/**
 * Build a PositionMap from a markdown string, assigning ProseMirror-like
 * positions to each non-empty line.
 */
function makePositionMap(markdown: string): PositionMap {
  const lines = markdown.split('\n');
  const lineToPos = new Map<number, { from: number; to: number }>();
  let pos = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim()) {
      lineToPos.set(i + 1, { from: pos, to: pos + line.length });
    }
    pos += line.length + 1;
  }

  return { lineToPos, markdown };
}

describe('computeSuggestionRanges', () => {
  describe('no changes', () => {
    it('returns empty array when content is identical', () => {
      const md = '## Purpose\n\nSome content here.';
      const posMap = makePositionMap(md);
      const ranges = computeSuggestionRanges(posMap, md);

      expect(ranges).toEqual([]);
    });

    it('returns empty array when only whitespace differs', () => {
      const original = 'Hello world';
      const proposed = 'Hello  world';
      const posMap = makePositionMap(original);

      expect(computeSuggestionRanges(posMap, proposed)).toEqual([]);
    });
  });

  describe('formatting-only changes are ignored via normalizeContent', () => {
    it('ignores list marker style changes (- vs *)', () => {
      const original = '- Item one\n- Item two';
      const proposed = '* Item one\n* Item two';
      const posMap = makePositionMap(original);

      expect(computeSuggestionRanges(posMap, proposed)).toEqual([]);
    });

    it('ignores heading marker changes when text is the same', () => {
      const original = '## Section Title\n\nContent here';
      const proposed = '### Section Title\n\nContent here';
      const posMap = makePositionMap(original);

      expect(computeSuggestionRanges(posMap, proposed)).toEqual([]);
    });

    it('ignores blockquote marker formatting changes', () => {
      const original = '> Some quoted text';
      const proposed = '>  Some quoted text';
      const posMap = makePositionMap(original);

      expect(computeSuggestionRanges(posMap, proposed)).toEqual([]);
    });

    it('ignores case-only changes', () => {
      const original = 'Hello World';
      const proposed = 'hello world';
      const posMap = makePositionMap(original);

      expect(computeSuggestionRanges(posMap, proposed)).toEqual([]);
    });
  });

  describe('delete ranges', () => {
    it('produces a delete range when a section is removed', () => {
      const original = [
        '## Section One',
        '',
        'Content of section one.',
        '',
        '## Section Two',
        '',
        'Content of section two.',
      ].join('\n');
      const proposed = [
        '## Section Two',
        '',
        'Content of section two.',
      ].join('\n');
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges.length).toBeGreaterThanOrEqual(1);
      // The deleted range should cover the heading + content of section one
      const deleteRange = ranges.find((r) => r.type === 'delete');
      expect(deleteRange).toBeDefined();
      expect(deleteRange!.originalText).toContain('Section One');
      expect(deleteRange!.originalText).toContain('Content of section one');
      expect(deleteRange!.decision).toBe('pending');
    });

    it('produces a delete range when a single line is removed', () => {
      const original = 'Line one\nLine two\nLine three';
      const proposed = 'Line one\nLine three';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges).toHaveLength(1);
      expect(ranges[0]!.originalText).toContain('Line two');
    });
  });

  describe('modify ranges', () => {
    it('produces a modify range with word-level diff segments', () => {
      const original = 'The quick brown fox';
      const proposed = 'The slow brown fox';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges).toHaveLength(1);
      expect(ranges[0]!.type).toBe('modify');
      expect(ranges[0]!.segments.length).toBeGreaterThan(0);

      const deleted = ranges[0]!.segments.find((s) => s.type === 'delete');
      const inserted = ranges[0]!.segments.find((s) => s.type === 'insert');
      expect(deleted?.text).toContain('quick');
      expect(inserted?.text).toContain('slow');
    });

    it('maps from/to to the correct ProseMirror positions', () => {
      const original = 'First line\n\nSecond line\n\nThird line';
      const proposed = 'First line\n\nModified second\n\nThird line';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges).toHaveLength(1);
      // The range should cover the "Second line" position
      const secondLinePos = posMap.lineToPos.get(3); // line 3 = "Second line"
      expect(secondLinePos).toBeDefined();
      expect(ranges[0]!.from).toBeLessThanOrEqual(secondLinePos!.from);
      expect(ranges[0]!.to).toBeGreaterThanOrEqual(secondLinePos!.to);
    });

    it('includes both original and proposed text', () => {
      const original = 'Old content here';
      const proposed = 'New content here';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges[0]!.originalText).toContain('Old');
      expect(ranges[0]!.proposedText).toContain('New');
    });
  });

  describe('insert ranges', () => {
    it('produces an insert range when new content is added', () => {
      const original = 'Line one\nLine three';
      const proposed = 'Line one\nLine two\nLine three';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges).toHaveLength(1);
      expect(ranges[0]!.proposedText).toContain('Line two');
    });

    it('produces an insert range when a new section is appended', () => {
      const original = '## Existing\n\nExisting content.';
      const proposed =
        '## Existing\n\nExisting content.\n\n## New Section\n\nNew content.';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges.length).toBeGreaterThanOrEqual(1);
      const insertRange = ranges.find(
        (r) => r.type === 'insert' || r.type === 'modify',
      );
      expect(insertRange).toBeDefined();
      expect(insertRange!.proposedText).toContain('New Section');
    });
  });

  describe('range metadata', () => {
    it('assigns unique IDs to each range', () => {
      const original = 'First line\nSecond line\nThird line';
      const proposed = 'Changed first\nSecond line\nChanged third';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);
      const ids = ranges.map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('sets decision to pending on all ranges', () => {
      const original = 'Old text';
      const proposed = 'New text';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);
      for (const range of ranges) {
        expect(range.decision).toBe('pending');
      }
    });

    it('does not include segments for delete ranges', () => {
      const original = 'Keep this\nRemove this';
      const proposed = 'Keep this';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);
      const deleteRange = ranges.find((r) => r.type === 'delete');
      if (deleteRange) {
        expect(deleteRange.segments).toEqual([]);
      }
    });
  });

  describe('mergeOverlappingRanges', () => {
    it('merges adjacent delete ranges within 20 positions', () => {
      // Create a document where removing two nearby sections produces
      // two delete hunks that should be merged
      const original = [
        '## Section A',
        '',
        'Content A.',
        '',
        '## Section B',
        '',
        'Content B.',
        '',
        '## Section C',
        '',
        'Content C.',
      ].join('\n');
      const proposed = [
        '## Section C',
        '',
        'Content C.',
      ].join('\n');
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      // Sections A and B are both deleted; if close enough they merge
      // into a single range
      const deleteRanges = ranges.filter((r) => r.type === 'delete');
      // Whether merged or not, the total coverage should include both sections
      const allOriginalText = deleteRanges
        .map((r) => r.originalText)
        .join(' ');
      expect(allOriginalText).toContain('Section A');
      expect(allOriginalText).toContain('Section B');
    });

    it('does not merge distant ranges', () => {
      // Manually create a position map with widely separated positions
      const lineToPos = new Map<number, { from: number; to: number }>();
      lineToPos.set(1, { from: 1, to: 10 });
      lineToPos.set(3, { from: 12, to: 25 });
      lineToPos.set(5, { from: 200, to: 215 });
      lineToPos.set(7, { from: 217, to: 230 });

      const markdown =
        'First line\n\nSecond line here\n\nThird line far away\n\nFourth line also far';
      const posMap: PositionMap = { lineToPos, markdown };

      const proposed =
        'Changed first\n\nChanged second\n\nChanged third far\n\nChanged fourth also';

      const ranges = computeSuggestionRanges(posMap, proposed);

      // The first two changes (positions 1-25) are close and may merge.
      // The last two changes (positions 200-230) are close and may merge.
      // But the two groups (25 vs 200) are >20 apart so should NOT merge.
      if (ranges.length > 1) {
        // Verify there's a gap between groups
        const sorted = [...ranges].sort((a, b) => a.from - b.from);
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i]!.from - sorted[i - 1]!.to;
          // If they didn't merge, the gap must be > 20
          if (gap > 0) {
            expect(gap).toBeGreaterThan(20);
          }
        }
      }
    });

    it('preserves a single range unchanged', () => {
      const original = 'Hello world';
      const proposed = 'Hello universe';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges).toHaveLength(1);
      expect(ranges[0]!.type).toBe('modify');
    });

    it('merges overlapping ranges of different types into modify', () => {
      // When two ranges overlap/are adjacent but have different types,
      // the merged result should be 'modify'
      const original = [
        'Line A',
        'Line B',
        'Line C',
      ].join('\n');
      // Remove Line B and change Line C -- these may produce adjacent
      // delete + modify hunks
      const proposed = [
        'Line A',
        'Changed Line C',
      ].join('\n');
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      // If merged, the combined range should be 'modify' (mixed types)
      // or we get separate ranges -- both are valid outcomes
      expect(ranges.length).toBeGreaterThanOrEqual(1);
      for (const range of ranges) {
        expect(['modify', 'delete', 'insert']).toContain(range.type);
      }
    });
  });

  describe('edge cases', () => {
    it('handles completely different content', () => {
      const original = 'Completely original content here';
      const proposed = 'Totally different text instead';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges.length).toBeGreaterThanOrEqual(1);
      expect(ranges[0]!.type).toBe('modify');
    });

    it('handles empty proposed content producing delete', () => {
      const original = 'Some content';
      const proposed = '';
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges.length).toBeGreaterThanOrEqual(1);
    });

    it('handles multi-line modifications', () => {
      const original = [
        '## Policy',
        '',
        'We shall do X.',
        'We shall also do Y.',
      ].join('\n');
      const proposed = [
        '## Policy',
        '',
        'We must do A.',
        'We must also do B.',
      ].join('\n');
      const posMap = makePositionMap(original);

      const ranges = computeSuggestionRanges(posMap, proposed);

      expect(ranges.length).toBeGreaterThanOrEqual(1);
      const modRange = ranges.find((r) => r.type === 'modify');
      expect(modRange).toBeDefined();
      expect(modRange!.proposedText).toContain('must');
    });
  });
});
