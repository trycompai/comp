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
  accept: (id: string) => void;
  reject: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  dismissAll: () => void;
  giveFeedback: (id: string, feedback: string) => void;
  isActive: boolean;
}

export function useSuggestions({
  editor,
  proposedMarkdown,
  onFeedback,
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [ranges, setRanges] = useState<SuggestionRange[]>([]);
  const proposedMarkdownRef = useRef(proposedMarkdown);
  const rangesRef = useRef(ranges);

  // Keep refs in sync
  proposedMarkdownRef.current = proposedMarkdown;
  rangesRef.current = ranges;

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
  }, [editor, proposedMarkdown]);

  // Sync ranges to ProseMirror plugin
  useEffect(() => {
    if (!editor) return;
    const { tr } = editor.state;
    tr.setMeta(suggestionsPluginKey, ranges);
    editor.view.dispatch(tr);
  }, [editor, ranges]);

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

  const activeCount = useMemo(
    () => ranges.filter((r) => r.decision === 'pending').length,
    [ranges],
  );

  const totalCount = ranges.length;
  const isActive = ranges.length > 0;

  return {
    ranges,
    activeCount,
    totalCount,
    accept,
    reject,
    acceptAll,
    rejectAll,
    dismissAll,
    giveFeedback,
    isActive,
  };
}
