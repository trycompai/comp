import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { markdownToTipTapJSON } from '../components/ai/markdown-utils';
import type { SuggestionRange } from './suggestion-types';

/**
 * Extend delete ranges that start at a heading to cover the whole section (up to
 * the next heading of the same or higher level), so "remove this section" takes
 * the heading AND all its content even if the diff only flagged part of it.
 */
export function extendDeleteRangesToSections(
  doc: ProseMirrorNode,
  ranges: SuggestionRange[],
): SuggestionRange[] {
  return ranges.map((range) => {
    if (range.type !== 'delete') return range;

    // Is the start of the range a heading?
    let headingLevel: number | null = null;
    doc.nodesBetween(range.from, Math.min(range.from + 5, range.to), (node) => {
      if (node.type.name === 'heading' && headingLevel === null) {
        headingLevel = (node.attrs as { level?: number }).level ?? 1;
      }
    });
    if (headingLevel === null) return range;

    // Walk forward to the next heading of the same or higher level.
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
    return extendTo > range.to ? { ...range, to: extendTo } : range;
  });
}

/**
 * Build the ProseMirror nodes to insert/replace for an accepted suggestion.
 *
 * When the edit lands inside a list, unwrap the list wrappers that
 * markdownToTipTapJSON emits ("- text" -> bulletList) down to their listItems,
 * so we replace a listItem with listItem(s) instead of dropping a whole new
 * list into the parent list — which would otherwise split the list into pieces
 * or nest it (CS-265). Outside a list, the nodes are used as-is.
 */
export function buildReplacementNodes(
  state: EditorState,
  proposedText: string,
  at: number,
): ProseMirrorNode[] {
  const pmNodes = markdownToTipTapJSON(proposedText).map((json) =>
    state.schema.nodeFromJSON(json),
  );

  // Resolve the parent at the edit site. Guarded so a malformed/out-of-range
  // position can never throw mid-apply — fall back to the nodes as-is.
  let parent: ProseMirrorNode;
  try {
    parent = state.doc.resolve(at).parent;
  } catch {
    return pmNodes;
  }
  const parentName = parent.type.name;

  // Inside a list: unwrap the list wrappers markdownToTipTapJSON emits
  // ("- text" -> bulletList) down to their listItems, so we replace a listItem
  // with listItem(s) rather than dropping a whole new list into the parent list
  // (which would split or nest it). CS-265.
  if (parentName === 'bulletList' || parentName === 'orderedList') {
    return pmNodes.flatMap((node) => {
      if (node.type.name !== 'bulletList' && node.type.name !== 'orderedList') {
        return [node];
      }
      const items: ProseMirrorNode[] = [];
      node.forEach((child) => items.push(child));
      return items;
    });
  }

  // Otherwise the range spans whole block boundaries (see build-position-map),
  // so the block nodes replace cleanly as-is.
  return pmNodes;
}
