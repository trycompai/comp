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

interface ActionCallbacks {
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onFeedback?: (id: string) => void;
}

// ── Widget factories ──

function createActionBar(
  rangeId: string,
  callbacks: ActionCallbacks
): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'suggestion-actions';

  const acceptBtn = document.createElement('button');
  acceptBtn.className = 'suggestion-action-btn suggestion-action-accept';
  acceptBtn.textContent = '\u2713 Accept';
  acceptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onAccept?.(rangeId);
  });

  const rejectBtn = document.createElement('button');
  rejectBtn.className = 'suggestion-action-btn suggestion-action-reject';
  rejectBtn.textContent = '\u2715 Reject';
  rejectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onReject?.(rangeId);
  });

  const feedbackBtn = document.createElement('button');
  feedbackBtn.className = 'suggestion-action-btn suggestion-action-feedback';
  feedbackBtn.textContent = '\u270E Edit';
  feedbackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onFeedback?.(rangeId);
  });

  bar.appendChild(acceptBtn);
  bar.appendChild(rejectBtn);
  bar.appendChild(feedbackBtn);
  return bar;
}

function createInsertionWidget(
  rangeId: string,
  text: string,
  schema: Schema,
  callbacks: ActionCallbacks
): (view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'suggestion-change-group';

    // Action bar at the top
    wrapper.appendChild(createActionBar(rangeId, callbacks));

    // Content
    const content = document.createElement('div');
    content.className = 'suggestion-new-section';

    try {
      const pmNodes = markdownLinesToNodes(text, schema);
      const serializer = DOMSerializer.fromSchema(schema);
      const fragment = Fragment.from(pmNodes);
      const rendered = serializer.serializeFragment(fragment);
      content.appendChild(rendered);
    } catch {
      content.textContent = text;
    }

    wrapper.appendChild(content);
    return wrapper;
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

    if (headingMatch?.[1] && headingMatch[2]) {
      flushList();
      const level = headingMatch[1].length;
      const headingType = schema.nodes.heading;
      if (headingType) {
        nodes.push(
          headingType.create({ level }, schema.text(headingMatch[2]))
        );
      }
    } else if (listMatch?.[1] && schema.nodes.listItem) {
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
  const seen = new Set<number>();

  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      const nodeEnd = pos + node.nodeSize;
      if (pos < to && nodeEnd > from) {
        // If this textblock is inside a listItem, decorate the listItem
        // so the bullet point is included in the highlight
        const resolved = doc.resolve(pos);
        for (let d = resolved.depth; d >= 1; d--) {
          const ancestor = resolved.node(d);
          if (ancestor.type.name === 'listItem') {
            const ancestorPos = resolved.before(d);
            if (!seen.has(ancestorPos)) {
              seen.add(ancestorPos);
              results.push({
                node: ancestor,
                pos: ancestorPos,
                end: ancestorPos + ancestor.nodeSize,
              });
            }
            return false;
          }
        }
        // Not inside a list item — use the textblock itself
        if (!seen.has(pos)) {
          seen.add(pos);
          results.push({ node, pos, end: nodeEnd });
        }
      }
      return false;
    }
    return true;
  });

  return results;
}

function buildDecorations(
  doc: ProseMirrorNode,
  ranges: SuggestionRange[],
  focusedId: string | null,
  callbacks: ActionCallbacks
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
          const firstBlock = blocks[0];
          if (firstBlock) {
            const resolved = doc.resolve(firstBlock.pos);
            const topPos = resolved.before(1);
            decorations.push(
              Decoration.widget(
                topPos,
                createInsertionWidget(range.id, range.proposedText, schema, callbacks),
                { side: -1, key: `insert-${range.id}` }
              )
            );
          }
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
            createInsertionWidget(range.id, range.proposedText, schema, callbacks),
            { side: 1, key: `insert-${range.id}` }
          )
        );
        break;
      }

      case 'delete': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to);

        // Action bar widget before the deleted blocks
        const firstDeleteBlock = blocks[0];
        if (firstDeleteBlock) {
          const resolved = doc.resolve(firstDeleteBlock.pos);
          const topPos = resolved.before(1);
          decorations.push(
            Decoration.widget(
              topPos,
              (_view: EditorView) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'suggestion-change-group suggestion-delete-group';
                wrapper.appendChild(createActionBar(range.id, callbacks));
                return wrapper;
              },
              { side: -1, key: `delete-actions-${range.id}` }
            )
          );
        }

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
      const extensionCallbacks: ActionCallbacks = {
        onAccept: this.options.onAccept,
        onReject: this.options.onReject,
        onFeedback: this.options.onFeedback,
      };

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
                let decorations: DecorationSet;
                try {
                  decorations = buildDecorations(
                    tr.doc,
                    pendingRanges,
                    meta.focusedId,
                    extensionCallbacks
                  );
                } catch (err) {
                  console.error('[SuggestionsPlugin] buildDecorations failed:', err);
                  decorations = DecorationSet.empty;
                }
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
