import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { suggestionsPluginKey } from '@trycompai/ui/editor';
import { markdownToTipTapJSON } from '../components/ai/markdown-utils';
import { buildPositionMap } from '../lib/build-position-map';
import { computeSuggestionRanges } from '../lib/compute-suggestion-ranges';
import type { SuggestionRange } from '../lib/suggestion-types';

interface UseSuggestionsOptions {
  editor: Editor | null;
  proposedMarkdown: string | null;
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
  resetLoading: () => void;
  editingRangeId: string | null;
  startEditing: (id: string) => void;
  cancelEditing: () => void;
  goToNext: () => void;
  goToPrev: () => void;
  isActive: boolean;
}

export function useSuggestions({
  editor,
  proposedMarkdown,
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [ranges, setRanges] = useState<SuggestionRange[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingRangeId, setEditingRangeId] = useState<string | null>(null);
  const proposedMarkdownRef = useRef(proposedMarkdown);
  const rangesRef = useRef(ranges);
  const rangesHistoryRef = useRef<SuggestionRange[][]>([]);

  // Keep refs in sync
  proposedMarkdownRef.current = proposedMarkdown;
  rangesRef.current = ranges;

  const pushRangesSnapshot = useCallback(() => {
    rangesHistoryRef.current.push([...rangesRef.current]);
  }, []);

  const pendingRanges = useMemo(
    () => ranges.filter((r) => r.decision === 'pending'),
    [ranges],
  );

  const loadingRanges = useMemo(
    () => ranges.filter((r) => r.decision === 'loading'),
    [ranges],
  );

  // Lock/unlock editor based on whether there are active suggestions.
  // Save the original editable state so we restore it correctly
  // (e.g., if the editor was already read-only due to permissions).
  const wasEditableRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!editor) return;
    const hasPendingOrLoading = pendingRanges.length > 0 || loadingRanges.length > 0;
    if (hasPendingOrLoading) {
      if (wasEditableRef.current === null) {
        wasEditableRef.current = editor.isEditable;
      }
      editor.setEditable(false);
    } else if (wasEditableRef.current !== null) {
      editor.setEditable(wasEditableRef.current);
      wasEditableRef.current = null;
    }
  }, [editor, pendingRanges.length, loadingRanges.length]);

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
      // Find the action bar widget for this range — it's rendered as a
      // .suggestion-change-group element near the range position.
      // The widget is placed just before the affected content in the DOM.
      const editorDom = editor.view.dom;
      const actionBars = editorDom.querySelectorAll('.suggestion-change-group');
      const { node } = editor.view.domAtPos(range.from);
      const contentEl =
        node instanceof HTMLElement ? node : node.parentElement;

      // Find the action bar closest to (and before) the content element
      let target: Element | null = null;
      for (const bar of actionBars) {
        if (
          contentEl &&
          (bar.compareDocumentPosition(contentEl) &
            Node.DOCUMENT_POSITION_FOLLOWING)
        ) {
          target = bar;
        }
      }

      // Fall back to the content element if no action bar found
      const scrollTarget = target ?? contentEl;
      if (!scrollTarget) return;

      // Find the scrollable container and scroll so the target sits
      // near the top with some breathing room, not dead center.
      const scrollContainer = scrollTarget.closest('[class*="overflow"]')
        ?? scrollTarget.closest('.ProseMirror')?.parentElement;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = scrollTarget.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + scrollContainer.scrollTop - 20;
        scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
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
    setEditingRangeId(null);
    if (!editor || !proposedMarkdown) {
      setRanges([]);
      return;
    }
    const positionMap = buildPositionMap(editor.state.doc);
    const initial = computeSuggestionRanges(positionMap, proposedMarkdown);
    // For delete ranges that start at a heading, extend to the next heading
    // of the same or higher level. This ensures full section deletions
    // include all content between headings, even if the AI left some.
    const doc = editor.state.doc;
    const extended = initial.map((range) => {
      if (range.type !== 'delete') return range;

      // Find the first block node in the range to check if it's a heading.
      // range.from may point inside a node, so resolve to find the parent.
      let headingLevel: number | null = null;
      doc.nodesBetween(range.from, Math.min(range.from + 5, range.to), (node) => {
        if (node.type.name === 'heading' && headingLevel === null) {
          headingLevel = (node.attrs as { level?: number }).level ?? 1;
        }
      });
      if (headingLevel === null) return range;

      // Walk forward from the end of the range to find the next heading
      // of the same or higher level.
      let nextHeadingPos: number | null = null;
      doc.nodesBetween(range.to, doc.content.size, (node, pos) => {
        if (nextHeadingPos !== null) return false;
        if (node.type.name === 'heading') {
          const level = (node.attrs as { level?: number }).level ?? 1;
          if (headingLevel !== null && level <= headingLevel) {
            nextHeadingPos = pos;
            return false;
          }
        }
        return true;
      });

      const extendTo = nextHeadingPos ?? doc.content.size;
      if (extendTo > range.to) {
        return { ...range, to: extendTo };
      }
      return range;
    });
    setRanges(extended);
    setCurrentIndex(0);
    rangesHistoryRef.current = [];

    // Auto-scroll to the first change
    const firstPending = initial.find((r) => r.decision === 'pending');
    if (firstPending) {
      // Small delay to let decorations render before scrolling
      requestAnimationFrame(() => {
        scrollToRange(firstPending);
      });
    }
  }, [editor, proposedMarkdown, scrollToRange]);

  // Listen for undo transactions to restore previous ranges state
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = ({ transaction }: { transaction: { getMeta: (key: string) => unknown } }) => {
      // ProseMirror's history plugin sets 'history$' meta on undo/redo
      const historyMeta = transaction.getMeta('history$');
      if (!historyMeta) return;
      const isUndo = (historyMeta as { redo?: boolean }).redo === false;
      if (isUndo && rangesHistoryRef.current.length > 0) {
        const previousRanges = rangesHistoryRef.current.pop();
        if (previousRanges) {
          setRanges(previousRanges);
        }
      }
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor]);

  // Sync ranges + focused index to ProseMirror plugin
  useEffect(() => {
    if (!editor) return;
    const { tr } = editor.state;
    const focusedId =
      pendingRanges.length > 0
        ? pendingRanges[Math.min(currentIndex, pendingRanges.length - 1)]?.id
        : null;
    tr.setMeta(suggestionsPluginKey, { ranges, focusedId, editingRangeId });
    editor.view.dispatch(tr);
  }, [editor, ranges, currentIndex, pendingRanges, editingRangeId]);

  const applyRangeToDoc = useCallback(
    (range: SuggestionRange) => {
      if (!editor) return;
      const { tr } = editor.state;
      if (range.type === 'delete') {
        tr.delete(range.from, range.to);
      } else if (range.type === 'insert') {
        // Insert at the end of the anchor position, not replacing it
        const jsonNodes = markdownToTipTapJSON(range.proposedText);
        const pmNodes = jsonNodes.map((json) =>
          editor.state.schema.nodeFromJSON(json),
        );
        if (pmNodes.length > 0) {
          tr.insert(range.to, pmNodes);
        }
      } else {
        // Modify: replace old content with new
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

      pushRangesSnapshot();
      applyRangeToDoc(range);

      // Simply mark as accepted — don't recompute ranges.
      // Recomputing re-diffs the modified doc against proposed markdown,
      // which creates phantom ranges when inserted content doesn't
      // round-trip identically through markdown extraction.
      setRanges((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, decision: 'accepted' as const } : r,
        ),
      );
    },
    [applyRangeToDoc, pushRangesSnapshot],
  );

  const reject = useCallback(
    (id: string) => {
      pushRangesSnapshot();
      setRanges((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, decision: 'rejected' as const } : r,
        ),
      );
    },
    [pushRangesSnapshot],
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

    pushRangesSnapshot();
    // Apply all pending ranges in reverse doc order within a single transaction
    const pending = rangesRef.current
      .filter((r) => r.decision === 'pending')
      .sort((a, b) => b.from - a.from);

    const { tr } = editor.state;
    for (const range of pending) {
      if (range.type === 'delete') {
        tr.delete(range.from, range.to);
      } else if (range.type === 'insert') {
        const jsonNodes = markdownToTipTapJSON(range.proposedText);
        const pmNodes = jsonNodes.map((json) =>
          editor.state.schema.nodeFromJSON(json),
        );
        if (pmNodes.length > 0) {
          tr.insert(range.to, pmNodes);
        }
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
  }, [editor, pushRangesSnapshot]);

  const rejectAll = useCallback(() => {
    pushRangesSnapshot();
    setRanges((prev) =>
      prev.map((r) =>
        r.decision === 'pending'
          ? { ...r, decision: 'rejected' as const }
          : r,
      ),
    );
  }, [pushRangesSnapshot]);

  const dismissAll = useCallback(() => {
    setEditingRangeId(null);
    setRanges([]);
    rangesHistoryRef.current = [];
  }, []);

  const giveFeedback = useCallback(
    async (id: string, feedback: string) => {
      const range = rangesRef.current.find((r) => r.id === id);
      if (!range) return;

      setEditingRangeId(null);
      setRanges((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, decision: 'loading' as const } : r,
        ),
      );

      try {
        const policyId = window.location.pathname.match(/policies\/([^/]+)/)?.[1];
        const res = await fetch(`/api/policies/${policyId}/edit-section`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            sectionText: range.proposedText,
            feedback,
          }),
        });

        if (!res.ok) throw new Error('Failed to edit section');
        const { updatedText } = await res.json() as { updatedText: string };

        setRanges((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, proposedText: updatedText, decision: 'pending' as const }
              : r,
          ),
        );
      } catch (err) {
        console.error('Section edit failed:', err);
        setRanges((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, decision: 'pending' as const } : r,
          ),
        );
      }
    },
    [],
  );

  const resetLoading = useCallback(() => {
    setRanges((prev) =>
      prev.map((r) =>
        r.decision === 'loading' ? { ...r, decision: 'pending' as const } : r,
      ),
    );
  }, []);

  const startEditing = useCallback((id: string) => {
    setEditingRangeId(id);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingRangeId(null);
  }, []);

  const activeCount = pendingRanges.length;
  const totalCount = ranges.length;
  const isActive = pendingRanges.length > 0 || loadingRanges.length > 0;

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
    resetLoading,
    editingRangeId,
    startEditing,
    cancelEditing,
    goToNext,
    goToPrev,
    isActive,
  };
}
