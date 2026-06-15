import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import { markdownToTipTapJSON } from '../components/ai/markdown-utils';

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

  // Inside a textblock (paragraph/heading): the diff range is a *content* range,
  // so splice in the new block's INLINE content rather than a whole block node.
  // Replacing content with a block splits the textblock and leaves an empty
  // paragraph behind (CS-265). Only safe for a single same-shape block.
  if (parent.isTextblock && pmNodes.length === 1 && pmNodes[0]!.isTextblock) {
    const inline: ProseMirrorNode[] = [];
    pmNodes[0]!.forEach((child) => inline.push(child));
    return inline;
  }

  return pmNodes;
}
