import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { suggestionsPluginKey } from '@comp/ui/editor';
import { markdownToTipTapJSON } from '../components/ai/markdown-utils';
import { buildPositionMap } from '../lib/build-position-map';
import { computeSuggestionRanges } from '../lib/compute-suggestion-ranges';
import type { SuggestionRange } from '../lib/suggestion-types';

interface UseSuggestionsOptions {
  editor: Editor | null;
  proposedMarkdown: string | null;
  onFeedback?: (rangeId: string, feedback: string) => void;
}

interface UseSuggestionsReturn {
  ranges: SuggestionRange[];
  activeCount: number;
  totalCount: number;
  currentIndex: number;
  accept: (id: string) => void;
  reject: (id: string) => void;
  acceptCurrent: () => void;
  rejectCurrent: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  dismissAll: () => void;
  giveFeedback: (id: string, feedback: string) => void;
  goToNext: () => void;
  goToPrev: () => void;
  isActive: boolean;
}

export function useSuggestions({
  editor,
  proposedMarkdown,
  onFeedback,
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [ranges, setRanges] = useState<SuggestionRange[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const proposedMarkdownRef = useRef(proposedMarkdown);
  const rangesRef = useRef(ranges);

  // Keep refs in sync
  proposedMarkdownRef.current = proposedMarkdown;
  rangesRef.current = ranges;

  const pendingRanges = useMemo(
    () => ranges.filter((r) => r.decision === 'pending'),
    [ranges],
  );

  // Clamp currentIndex when pending ranges change
  useEffect(() => {
    if (pendingRanges.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= pendingRanges.length) {
      setCurrentIndex(pendingRanges.length - 1);
    }
  }, [pendingRanges.length, currentIndex]);

  const scrollToRange = useCallback(
    (range: SuggestionRange) => {
      if (!editor) return;
      // Scroll the editor to show the range
      const { node } = editor.view.domAtPos(range.from);
      const element =
        node instanceof HTMLElement ? node : node.parentElement;
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [editor],
  );

  const recomputeRanges = useCallback(
    (prevRanges: SuggestionRange[]) => {
      if (!editor || !proposedMarkdownRef.current) return [];
      const positionMap = buildPositionMap(editor.state.doc);
      const freshRanges = computeSuggestionRanges(
        positionMap,
        proposedMarkdownRef.current,
      );
      // Carry over decisions by matching content identity
      const decisionMap = new Map<string, SuggestionRange['decision']>();
      for (const r of prevRanges) {
        if (r.decision !== 'pending') {
          decisionMap.set(`${r.originalText}::${r.proposedText}`, r.decision);
        }
      }
      return freshRanges.map((r) => {
        const key = `${r.originalText}::${r.proposedText}`;
        const prevDecision = decisionMap.get(key);
        return prevDecision ? { ...r, decision: prevDecision } : r;
      });
    },
    [editor],
  );

  // Compute initial ranges when proposedMarkdown changes
  useEffect(() => {
    if (!editor || !proposedMarkdown) {
      setRanges([]);
      return;
    }
    const positionMap = buildPositionMap(editor.state.doc);
    const initial = computeSuggestionRanges(positionMap, proposedMarkdown);
    setRanges(initial);
    setCurrentIndex(0);
  }, [editor, proposedMarkdown]);

  // Sync ranges + focused index to ProseMirror plugin
  useEffect(() => {
    if (!editor) return;
    const { tr } = editor.state;
    const focusedId =
      pendingRanges.length > 0
        ? pendingRanges[Math.min(currentIndex, pendingRanges.length - 1)]?.id
        : null;
    tr.setMeta(suggestionsPluginKey, { ranges, focusedId });
    editor.view.dispatch(tr);
  }, [editor, ranges, currentIndex, pendingRanges]);

  const applyRangeToDoc = useCallback(
    (range: SuggestionRange) => {
      if (!editor) return;
      const { tr } = editor.state;
      if (range.type === 'delete') {
        tr.delete(range.from, range.to);
      } else {
        const jsonNodes = markdownToTipTapJSON(range.proposedText);
        const pmNodes = jsonNodes.map((json) =>
          editor.state.schema.nodeFromJSON(json),
        );
        if (pmNodes.length > 0) {
          tr.replaceWith(range.from, range.to, pmNodes);
        }
      }
      editor.view.dispatch(tr);
    },
    [editor],
  );

  const accept = useCallback(
    (id: string) => {
      const range = rangesRef.current.find((r) => r.id === id);
      if (!range || range.decision !== 'pending') return;

      applyRangeToDoc(range);

      const updatedRanges = rangesRef.current.map((r) =>
        r.id === id ? { ...r, decision: 'accepted' as const } : r,
      );
      const recomputed = recomputeRanges(updatedRanges);
      setRanges(recomputed);
    },
    [applyRangeToDoc, recomputeRanges],
  );

  const reject = useCallback(
    (id: string) => {
      setRanges((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, decision: 'rejected' as const } : r,
        ),
      );
    },
    [],
  );

  const acceptCurrent = useCallback(() => {
    const range = pendingRanges[currentIndex];
    if (range) accept(range.id);
  }, [pendingRanges, currentIndex, accept]);

  const rejectCurrent = useCallback(() => {
    const range = pendingRanges[currentIndex];
    if (range) reject(range.id);
  }, [pendingRanges, currentIndex, reject]);

  const goToNext = useCallback(() => {
    if (pendingRanges.length === 0) return;
    const nextIndex = (currentIndex + 1) % pendingRanges.length;
    setCurrentIndex(nextIndex);
    const range = pendingRanges[nextIndex];
    if (range) scrollToRange(range);
  }, [pendingRanges, currentIndex, scrollToRange]);

  const goToPrev = useCallback(() => {
    if (pendingRanges.length === 0) return;
    const prevIndex =
      (currentIndex - 1 + pendingRanges.length) % pendingRanges.length;
    setCurrentIndex(prevIndex);
    const range = pendingRanges[prevIndex];
    if (range) scrollToRange(range);
  }, [pendingRanges, currentIndex, scrollToRange]);

  const acceptAll = useCallback(() => {
    if (!editor) return;

    // Apply all pending ranges in reverse doc order within a single transaction
    const pending = rangesRef.current
      .filter((r) => r.decision === 'pending')
      .sort((a, b) => b.from - a.from);

    const { tr } = editor.state;
    for (const range of pending) {
      if (range.type === 'delete') {
        tr.delete(range.from, range.to);
      } else {
        const jsonNodes = markdownToTipTapJSON(range.proposedText);
        const pmNodes = jsonNodes.map((json) =>
          editor.state.schema.nodeFromJSON(json),
        );
        if (pmNodes.length > 0) {
          tr.replaceWith(range.from, range.to, pmNodes);
        }
      }
    }
    editor.view.dispatch(tr);

    setRanges((prev) =>
      prev.map((r) =>
        r.decision === 'pending'
          ? { ...r, decision: 'accepted' as const }
          : r,
      ),
    );
  }, [editor]);

  const rejectAll = useCallback(() => {
    setRanges((prev) =>
      prev.map((r) =>
        r.decision === 'pending'
          ? { ...r, decision: 'rejected' as const }
          : r,
      ),
    );
  }, []);

  const dismissAll = useCallback(() => {
    setRanges([]);
  }, []);

  const giveFeedback = useCallback(
    (id: string, feedback: string) => {
      onFeedback?.(id, feedback);
    },
    [onFeedback],
  );

  const activeCount = pendingRanges.length;
  const totalCount = ranges.length;
  const isActive = ranges.length > 0;

  return {
    ranges,
    activeCount,
    totalCount,
    currentIndex,
    accept,
    reject,
    acceptCurrent,
    rejectCurrent,
    acceptAll,
    rejectAll,
    dismissAll,
    giveFeedback,
    goToNext,
    goToPrev,
    isActive,
  };
}
