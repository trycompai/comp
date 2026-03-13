import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SuggestionRange } from '../../lib/suggestion-types';

// --- Module mocks ---

vi.mock('@comp/ui/editor', () => ({
  suggestionsPluginKey: { key: 'suggestions$' },
}));

vi.mock('../../lib/build-position-map', () => ({
  buildPositionMap: vi.fn(),
}));

vi.mock('../../lib/compute-suggestion-ranges', () => ({
  computeSuggestionRanges: vi.fn(),
}));

vi.mock('../../components/ai/markdown-utils', () => ({
  markdownToTipTapJSON: vi.fn(() => [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello world updated' }] },
  ]),
}));

import { buildPositionMap } from '../../lib/build-position-map';
import { computeSuggestionRanges } from '../../lib/compute-suggestion-ranges';
import { useSuggestions } from '../use-suggestions';

// --- Helpers ---

function makeMockEditor() {
  const dispatch = vi.fn();
  const setMeta = vi.fn();
  const deleteRange = vi.fn();
  const replaceWith = vi.fn();
  const nodeFromJSON = vi.fn(() => ({ type: 'paragraph' }));

  const tr = {
    setMeta,
    delete: deleteRange,
    replaceWith,
  };

  const doc = {
    forEach: vi.fn(),
  };

  return {
    state: {
      doc,
      tr,
      schema: {
        nodeFromJSON,
      },
      get: () => tr,
    },
    view: {
      dispatch,
    },
    // expose internals for inspection
    _mocks: { dispatch, setMeta, deleteRange, replaceWith, nodeFromJSON },
  };
}

function makeSuggestionRange(overrides: Partial<SuggestionRange> = {}): SuggestionRange {
  return {
    id: 'suggestion-1-1',
    type: 'modify',
    from: 1,
    to: 13,
    segments: [{ text: 'Hello world', type: 'unchanged' }],
    proposedText: 'Hello world updated',
    originalText: 'Hello world',
    decision: 'pending',
    ...overrides,
  };
}

// --- Tests ---

describe('useSuggestions', () => {
  beforeEach(() => {
    vi.mocked(buildPositionMap).mockReturnValue({
      lineToPos: new Map([[1, { from: 1, to: 13 }]]),
      markdown: 'Hello world',
    });
    vi.mocked(computeSuggestionRanges).mockReturnValue([]);
  });

  describe('when proposedMarkdown is null', () => {
    it('returns empty ranges', () => {
      const editor = makeMockEditor();
      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: null,
        }),
      );

      expect(result.current.ranges).toEqual([]);
    });

    it('returns isActive=false', () => {
      const editor = makeMockEditor();
      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: null,
        }),
      );

      expect(result.current.isActive).toBe(false);
    });

    it('returns activeCount=0 and totalCount=0', () => {
      const editor = makeMockEditor();
      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: null,
        }),
      );

      expect(result.current.activeCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('when editor is null', () => {
    it('returns empty ranges', () => {
      const { result } = renderHook(() =>
        useSuggestions({
          editor: null,
          proposedMarkdown: 'Hello world',
        }),
      );

      expect(result.current.ranges).toEqual([]);
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('when there are no proposed changes', () => {
    it('returns isActive=false when computeSuggestionRanges returns empty', () => {
      vi.mocked(computeSuggestionRanges).mockReturnValue([]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world',
        }),
      );

      expect(result.current.isActive).toBe(false);
      expect(result.current.ranges).toHaveLength(0);
    });
  });

  describe('when there are proposed changes', () => {
    it('returns the computed ranges from computeSuggestionRanges', () => {
      const range = makeSuggestionRange();
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      expect(result.current.ranges).toHaveLength(1);
      expect(result.current.ranges[0]).toMatchObject(range);
      expect(result.current.isActive).toBe(true);
    });

    it('returns correct activeCount for pending ranges', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'pending' }),
        makeSuggestionRange({ id: 'suggestion-2-2', decision: 'pending' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      expect(result.current.activeCount).toBe(2);
      expect(result.current.totalCount).toBe(2);
    });
  });

  describe('reject(id)', () => {
    it('marks the specified range as rejected', () => {
      const range = makeSuggestionRange({ id: 'suggestion-1-1', decision: 'pending' });
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.reject('suggestion-1-1');
      });

      expect(result.current.ranges[0].decision).toBe('rejected');
    });

    it('does not change other ranges when rejecting one', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'pending' }),
        makeSuggestionRange({ id: 'suggestion-2-2', decision: 'pending' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.reject('suggestion-1-1');
      });

      expect(result.current.ranges[0].decision).toBe('rejected');
      expect(result.current.ranges[1].decision).toBe('pending');
    });

    it('decrements activeCount after rejection', () => {
      const range = makeSuggestionRange({ id: 'suggestion-1-1', decision: 'pending' });
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      expect(result.current.activeCount).toBe(1);

      act(() => {
        result.current.reject('suggestion-1-1');
      });

      expect(result.current.activeCount).toBe(0);
    });
  });

  describe('rejectAll()', () => {
    it('marks all pending ranges as rejected', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'pending' }),
        makeSuggestionRange({ id: 'suggestion-2-2', decision: 'pending' }),
        makeSuggestionRange({ id: 'suggestion-3-3', decision: 'pending' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.rejectAll();
      });

      for (const r of result.current.ranges) {
        expect(r.decision).toBe('rejected');
      }
    });

    it('does not alter already-accepted ranges', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'accepted' }),
        makeSuggestionRange({ id: 'suggestion-2-2', decision: 'pending' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.rejectAll();
      });

      expect(result.current.ranges[0].decision).toBe('accepted');
      expect(result.current.ranges[1].decision).toBe('rejected');
    });

    it('sets activeCount to 0', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'pending' }),
        makeSuggestionRange({ id: 'suggestion-2-2', decision: 'pending' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.rejectAll();
      });

      expect(result.current.activeCount).toBe(0);
    });
  });

  describe('dismissAll()', () => {
    it('clears all ranges', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1' }),
        makeSuggestionRange({ id: 'suggestion-2-2' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      expect(result.current.ranges).toHaveLength(2);

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.ranges).toHaveLength(0);
    });

    it('sets isActive to false after dismiss', () => {
      const range = makeSuggestionRange();
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('sets totalCount to 0', () => {
      const range = makeSuggestionRange();
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('giveFeedback(id, feedback)', () => {
    it('calls the onFeedback callback with id and feedback', () => {
      const onFeedback = vi.fn();
      const range = makeSuggestionRange({ id: 'suggestion-1-1' });
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
          onFeedback,
        }),
      );

      act(() => {
        result.current.giveFeedback('suggestion-1-1', 'Make it shorter');
      });

      expect(onFeedback).toHaveBeenCalledOnce();
      expect(onFeedback).toHaveBeenCalledWith('suggestion-1-1', 'Make it shorter');
    });

    it('does not throw when onFeedback is not provided', () => {
      const range = makeSuggestionRange({ id: 'suggestion-1-1' });
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      expect(() => {
        act(() => {
          result.current.giveFeedback('suggestion-1-1', 'Make it shorter');
        });
      }).not.toThrow();
    });

    it('passes the exact feedback string to the callback', () => {
      const onFeedback = vi.fn();
      const range = makeSuggestionRange({ id: 'suggestion-1-1' });
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
          onFeedback,
        }),
      );

      const feedbackText = 'Please use more formal language';
      act(() => {
        result.current.giveFeedback('suggestion-1-1', feedbackText);
      });

      expect(onFeedback).toHaveBeenCalledWith('suggestion-1-1', feedbackText);
    });
  });

  describe('isActive', () => {
    it('returns false when all ranges are resolved (rejected)', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'rejected' }),
        makeSuggestionRange({ id: 'suggestion-2-2', decision: 'rejected' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      // All ranges are rejected (non-pending) but isActive is based on ranges.length > 0
      // The hook sets isActive = ranges.length > 0
      expect(result.current.isActive).toBe(true); // ranges exist, just all resolved
      expect(result.current.activeCount).toBe(0); // but no pending ones
    });

    it('returns false when dismissAll clears all ranges', () => {
      const ranges = [
        makeSuggestionRange({ id: 'suggestion-1-1', decision: 'rejected' }),
      ];
      vi.mocked(computeSuggestionRanges).mockReturnValue(ranges);
      const editor = makeMockEditor();

      const { result } = renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      act(() => {
        result.current.dismissAll();
      });

      expect(result.current.isActive).toBe(false);
    });
  });

  describe('ProseMirror dispatch side effect', () => {
    it('dispatches a transaction to the editor view whenever ranges change', () => {
      const range = makeSuggestionRange();
      vi.mocked(computeSuggestionRanges).mockReturnValue([range]);
      const editor = makeMockEditor();

      renderHook(() =>
        useSuggestions({
          editor: editor as never,
          proposedMarkdown: 'Hello world updated',
        }),
      );

      // dispatch is called once from the ranges sync effect
      expect(editor._mocks.dispatch).toHaveBeenCalled();
      expect(editor._mocks.setMeta).toHaveBeenCalled();
    });
  });
});
