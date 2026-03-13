import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  DOMSerializer,
  Fragment,
  type Node as ProseMirrorNode,
  type Schema,
} from '@tiptap/pm/model';

export interface SuggestionRange {
  id: string;
  type: 'modify' | 'insert' | 'delete';
  from: number;
  to: number;
  segments: Array<{ text: string; type: 'unchanged' | 'insert' | 'delete' }>;
  proposedText: string;
  originalText: string;
  decision: 'pending' | 'accepted' | 'rejected';
}

export interface SuggestionsPluginState {
  ranges: SuggestionRange[];
  focusedId: string | null;
  decorations: DecorationSet;
}

export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>(
  'suggestions'
);

export interface SuggestionsExtensionOptions {
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onFeedback?: (id: string) => void;
}


// ── Widget factories ──

function createInsertionWidget(
  text: string,
  schema: Schema
): (view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const div = document.createElement('div');
    div.className = 'suggestion-new-section';

    try {
      const pmNodes = markdownLinesToNodes(text, schema);
      const serializer = DOMSerializer.fromSchema(schema);
      const fragment = Fragment.from(pmNodes);
      const rendered = serializer.serializeFragment(fragment);
      div.appendChild(rendered);
    } catch {
      div.textContent = text;
    }

    return div;
  };
}

/**
 * Parse markdown lines into ProseMirror nodes.
 * Handles headings (##), list items (-/*), and plain paragraphs.
 */
function markdownLinesToNodes(
  text: string,
  schema: Schema
): ProseMirrorNode[] {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const nodes: ProseMirrorNode[] = [];
  let listItems: ProseMirrorNode[] = [];

  const flushList = () => {
    if (listItems.length > 0 && schema.nodes.bulletList) {
      nodes.push(schema.nodes.bulletList.create(null, listItems));
      listItems = [];
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const listMatch = line.match(/^[-*]\s+(.+)$/);

    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingType = schema.nodes.heading;
      if (headingType) {
        nodes.push(
          headingType.create({ level }, schema.text(headingMatch[2]))
        );
      }
    } else if (listMatch && schema.nodes.listItem) {
      const paragraph = schema.nodes.paragraph?.create(
        null,
        schema.text(listMatch[1])
      );
      if (paragraph) {
        listItems.push(schema.nodes.listItem.create(null, paragraph));
      }
    } else {
      flushList();
      const paragraph = schema.nodes.paragraph?.create(
        null,
        line.trim() ? schema.text(line.trim()) : undefined
      );
      if (paragraph) {
        nodes.push(paragraph);
      }
    }
  }
  flushList();
  return nodes;
}

// ── Decoration building ──

/**
 * Find all top-level block nodes whose position range overlaps [from, to].
 * Returns an array of { node, pos, end } where pos/end are the exact
 * node boundaries (suitable for Decoration.node).
 */
function findBlockNodesInRange(
  doc: ProseMirrorNode,
  from: number,
  to: number
): Array<{ node: ProseMirrorNode; pos: number; end: number }> {
  const results: Array<{
    node: ProseMirrorNode;
    pos: number;
    end: number;
  }> = [];

  doc.descendants((node, pos) => {
    // We want block nodes that contain text (paragraphs, headings, list items)
    // but not their parent containers (lists, blockquotes, doc)
    if (node.isTextblock) {
      const nodeEnd = pos + node.nodeSize;
      // Check overlap with range
      if (pos < to && nodeEnd > from) {
        results.push({ node, pos, end: nodeEnd });
      }
      return false; // Don't descend into text blocks
    }
    return true; // Descend into containers
  });

  return results;
}

function buildDecorations(
  doc: ProseMirrorNode,
  ranges: SuggestionRange[],
  focusedId: string | null
): DecorationSet {
  const decorations: Decoration[] = [];
  const schema = doc.type.schema;

  for (const range of ranges) {
    if (range.from < 0 || range.to > doc.content.size) continue;
    const isFocused = range.id === focusedId;
    const focusedSuffix = isFocused ? ' suggestion-focused' : '';

    switch (range.type) {
      case 'modify': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to);

        // Place proposed content widget BEFORE the top-level ancestor
        // of the first affected block (so it's outside any nesting)
        if (blocks.length > 0) {
          const resolved = doc.resolve(blocks[0].pos);
          // Walk up to depth 1 (direct child of doc)
          const topPos = resolved.before(1);
          decorations.push(
            Decoration.widget(
              topPos,
              createInsertionWidget(range.proposedText, schema),
              { side: -1, key: `insert-${range.id}` }
            )
          );
        }

        // Mark old content as deleted (red strikethrough)
        for (const block of blocks) {
          decorations.push(
            Decoration.node(block.pos, block.end, {
              class: `suggestion-deleted-section${focusedSuffix}`,
            })
          );
        }
        break;
      }

      case 'insert': {
        // Place at the top-level position so the widget isn't nested
        const resolved = doc.resolve(range.from);
        const insertPos = resolved.depth >= 1
          ? resolved.before(1)
          : range.from;
        decorations.push(
          Decoration.widget(
            insertPos,
            createInsertionWidget(range.proposedText, schema),
            { side: 1, key: `insert-${range.id}` }
          )
        );
        break;
      }

      case 'delete': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to);

        for (const block of blocks) {
          decorations.push(
            Decoration.node(block.pos, block.end, {
              class: `suggestion-deleted-section${focusedSuffix}`,
            })
          );
        }
        break;
      }
    }

    // No separate gutter — accept/reject is handled by the top bar
  }

  return DecorationSet.create(doc, decorations);
}

// ── Extension ──

export const SuggestionsExtension =
  Extension.create<SuggestionsExtensionOptions>({
    name: 'suggestions',

    addOptions() {
      return {
        onAccept: undefined,
        onReject: undefined,
        onFeedback: undefined,
      };
    },

    addProseMirrorPlugins() {
      return [
        new Plugin<SuggestionsPluginState>({
          key: suggestionsPluginKey,

          state: {
            init(): SuggestionsPluginState {
              return {
                ranges: [],
                focusedId: null,
                decorations: DecorationSet.empty,
              };
            },

            apply(tr, state): SuggestionsPluginState {
              const meta = tr.getMeta(suggestionsPluginKey) as
                | { ranges: SuggestionRange[]; focusedId: string | null }
                | undefined;

              if (meta !== undefined) {
                const pendingRanges = meta.ranges.filter(
                  (r) => r.decision === 'pending'
                );
                const decorations = buildDecorations(
                  tr.doc,
                  pendingRanges,
                  meta.focusedId
                );
                return {
                  ranges: meta.ranges,
                  focusedId: meta.focusedId,
                  decorations,
                };
              }

              if (tr.docChanged) {
                return {
                  ranges: state.ranges,
                  focusedId: state.focusedId,
                  decorations: state.decorations.map(tr.mapping, tr.doc),
                };
              }

              return state;
            },
          },

          props: {
            decorations(state) {
              return (
                suggestionsPluginKey.getState(state)?.decorations ??
                DecorationSet.empty
              );
            },
            attributes(): Record<string, string> {
              return {};
            },
            editable(state) {
              const pluginState = suggestionsPluginKey.getState(state);
              const hasPending = pluginState?.ranges.some(
                (r) => r.decision === 'pending'
              );
              // Lock editor while suggestions are active
              return !hasPending;
            },
          },
        }),
      ];
    },
  });
