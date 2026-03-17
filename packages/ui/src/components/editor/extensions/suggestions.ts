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
  decision: 'pending' | 'accepted' | 'rejected' | 'loading';
}

export interface SuggestionsPluginState {
  ranges: SuggestionRange[];
  focusedId: string | null;
  editingRangeId: string | null;
  decorations: DecorationSet;
}

export const suggestionsPluginKey = new PluginKey<SuggestionsPluginState>(
  'suggestions'
);

export type MarkdownToJSONFn = (markdown: string) => Array<Record<string, unknown>>;

export interface SuggestionsExtensionOptions {
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onEditClick?: (id: string) => void;
  onFeedbackSubmit?: (id: string, feedback: string) => void;
  onFeedbackCancel?: () => void;
  markdownToJSON?: MarkdownToJSONFn;
}

interface ActionCallbacks {
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onEditClick?: (id: string) => void;
  onFeedbackSubmit?: (id: string, feedback: string) => void;
  onFeedbackCancel?: () => void;
}

// ── Widget factories ──

function createActionBar(
  rangeId: string,
  callbacks: ActionCallbacks,
  isEditing: boolean
): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'suggestion-actions';
  bar.dataset.rangeId = rangeId;

  // Buttons row — always horizontal
  const buttonsRow = document.createElement('div');
  buttonsRow.className = 'suggestion-actions-buttons';

  const acceptBtn = document.createElement('button');
  acceptBtn.type = 'button';
  acceptBtn.className = 'suggestion-action-btn suggestion-action-accept';
  acceptBtn.textContent = '\u2713';
  acceptBtn.title = 'Accept';
  acceptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onAccept?.(rangeId);
  });

  const rejectBtn = document.createElement('button');
  rejectBtn.type = 'button';
  rejectBtn.className = 'suggestion-action-btn suggestion-action-reject';
  rejectBtn.textContent = '\u2715';
  rejectBtn.title = 'Reject';
  rejectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onReject?.(rangeId);
  });

  const feedbackBtn = document.createElement('button');
  feedbackBtn.type = 'button';
  feedbackBtn.className = 'suggestion-action-btn suggestion-action-feedback';
  feedbackBtn.textContent = '\u270E';
  feedbackBtn.title = 'Edit';
  feedbackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    callbacks.onEditClick?.(rangeId);
  });

  buttonsRow.appendChild(acceptBtn);
  buttonsRow.appendChild(rejectBtn);
  buttonsRow.appendChild(feedbackBtn);
  bar.appendChild(buttonsRow);

  // Feedback input row — only when editing this range
  if (isEditing) {
    const feedbackRow = document.createElement('div');
    feedbackRow.className = 'suggestion-feedback-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'suggestion-feedback-input';
    input.placeholder = 'How should this section be changed?';

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'suggestion-action-btn suggestion-action-feedback';
    sendBtn.textContent = 'Send';
    sendBtn.disabled = true;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'suggestion-action-btn';
    cancelBtn.textContent = 'Cancel';

    input.addEventListener('input', () => {
      sendBtn.disabled = !input.value.trim();
    });

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      // Cmd/Ctrl+Enter to submit, plain Enter does nothing
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && input.value.trim()) {
        e.preventDefault();
        callbacks.onFeedbackSubmit?.(rangeId, input.value.trim());
      } else if (e.key === 'Enter') {
        e.preventDefault(); // prevent any default form behavior
      } else if (e.key === 'Escape') {
        e.preventDefault();
        callbacks.onFeedbackCancel?.();
      }
    });

    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (input.value.trim()) {
        callbacks.onFeedbackSubmit?.(rangeId, input.value.trim());
      }
    });

    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onFeedbackCancel?.();
    });

    feedbackRow.appendChild(input);
    feedbackRow.appendChild(sendBtn);
    feedbackRow.appendChild(cancelBtn);
    bar.appendChild(feedbackRow);

    // Auto-focus the input after DOM insertion
    requestAnimationFrame(() => input.focus());
  }

  return bar;
}

function createInsertionWidget(
  rangeId: string,
  text: string,
  schema: Schema,
  callbacks: ActionCallbacks,
  isEditing: boolean,
  markdownToJSON?: (markdown: string) => Array<Record<string, unknown>>
): (view: EditorView) => HTMLElement {
  return (view: EditorView) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'suggestion-change-group';

    // Action bar at the top
    wrapper.appendChild(createActionBar(rangeId, callbacks, isEditing));

    // Content — render using the same parser that accept uses,
    // serialized through ProseMirror's DOMSerializer for identical output.
    const content = document.createElement('div');
    content.className = 'suggestion-new-section';

    let nodes: ProseMirrorNode[];
    if (markdownToJSON) {
      // Use the same parser as accept for identical rendering
      const jsonNodes = markdownToJSON(text);
      nodes = jsonNodes.map((json) => schema.nodeFromJSON(json));
    } else {
      nodes = markdownToNodes(text, schema);
    }

    const fragment = Fragment.from(nodes);
    const tempDoc = schema.topNodeType.create(null, fragment);
    const dom = DOMSerializer.fromSchema(schema).serializeFragment(
      tempDoc.content,
      { document }
    );
    content.appendChild(dom);

    wrapper.appendChild(content);
    return wrapper;
  };
}

/**
 * Parse markdown text into ProseMirror nodes using the editor's schema.
 * This ensures the preview matches exactly what gets inserted on accept.
 */
function markdownToNodes(
  markdown: string,
  schema: Schema
): ProseMirrorNode[] {
  const lines = markdown.split('\n');
  const result: ProseMirrorNode[] = [];
  let listItems: ProseMirrorNode[] = [];

  function flushList() {
    if (listItems.length > 0) {
      const listType = schema.nodes.bulletList;
      if (listType) {
        result.push(listType.create(null, listItems));
      }
      listItems = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch?.[1] && headingMatch[2]) {
      flushList();
      const headingType = schema.nodes.heading;
      if (headingType) {
        result.push(
          headingType.create(
            { level: headingMatch[1].length },
            schema.text(headingMatch[2])
          )
        );
      }
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const orderedMatch = !bulletMatch ? trimmed.match(/^\d+\.\s+(.+)$/) : null;
    const listMatch = bulletMatch?.[1] ?? orderedMatch?.[1];
    if (listMatch) {
      const listItemType = schema.nodes.listItem;
      const paragraphType = schema.nodes.paragraph;
      if (listItemType && paragraphType) {
        listItems.push(
          listItemType.create(
            null,
            paragraphType.create(null, schema.text(listMatch))
          )
        );
      }
      continue;
    }

    flushList();
    const paragraphType = schema.nodes.paragraph;
    if (paragraphType) {
      result.push(
        paragraphType.create(null, schema.text(trimmed))
      );
    }
  }

  flushList();
  return result;
}

/**
 * Line width patterns to mimic real text — varies per line to look natural.
 */
const SKELETON_LINE_WIDTHS = [100, 92, 78, 95, 60, 85, 70, 50];

function createSkeletonWidget(lineCount: number): (view: EditorView) => HTMLElement {
  const count = Math.max(4, Math.min(lineCount + 2, 10));

  return (_view: EditorView) => {
    const wrapper = document.createElement('div');
    // Matches DS Skeleton: bg-muted + animate-pulse, plus green left border
    wrapper.className = 'suggestion-change-group suggestion-loading';

    const labelEl = document.createElement('div');
    labelEl.className = 'flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-3';

    // Spinner — matches DS loading pattern
    const spinner = document.createElement('div');
    spinner.className = 'h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin';
    labelEl.appendChild(spinner);
    labelEl.appendChild(document.createTextNode('Rewriting section\u2026'));
    wrapper.appendChild(labelEl);

    const skeleton = document.createElement('div');
    skeleton.className = 'flex flex-col gap-2.5';

    for (let i = 0; i < count; i++) {
      const line = document.createElement('div');
      line.className = 'rounded-md h-3 suggestion-skeleton-line';
      const w = SKELETON_LINE_WIDTHS[i % SKELETON_LINE_WIDTHS.length] ?? 80;
      line.style.width = `${w}%`;
      line.style.animationDelay = `${i * 100}ms`;
      skeleton.appendChild(line);
    }

    wrapper.appendChild(skeleton);
    return wrapper;
  };
}

// ── Decoration building ──

/**
 * Resolve a position to the top-level (depth 1) node boundary.
 * This ensures widgets are placed outside nested structures like <ul>
 * so they span the full editor width.
 */
function resolveTopLevelPos(doc: ProseMirrorNode, pos: number): number {
  const resolved = doc.resolve(pos);
  if (resolved.depth > 1) {
    return resolved.before(1);
  }
  return pos;
}

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
        const resolved = doc.resolve(pos);
        for (let d = resolved.depth; d >= 1; d--) {
          const ancestor = resolved.node(d);

          if (ancestor.type.name === 'listItem') {
            // Before decorating individual list items, check if the
            // parent list is fully covered — if so, decorate the list
            // as one block instead of individual items.
            const parentDepth = d - 1;
            if (parentDepth >= 1) {
              const parentNode = resolved.node(parentDepth);
              if (parentNode.type.name === 'bulletList' || parentNode.type.name === 'orderedList') {
                const parentPos = resolved.before(parentDepth);
                const parentEnd = parentPos + parentNode.nodeSize;
                let allItemsCovered = true;
                parentNode.forEach((item, offset) => {
                  const itemStart = parentPos + 1 + offset;
                  const itemEnd = itemStart + item.nodeSize;
                  if (itemEnd <= from || itemStart >= to) {
                    allItemsCovered = false;
                  }
                });
                if (allItemsCovered) {
                  if (!seen.has(parentPos)) {
                    seen.add(parentPos);
                    results.push({ node: parentNode, pos: parentPos, end: parentEnd });
                  }
                  return false;
                }
              }
            }
            // Parent list not fully covered — decorate individual list item
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

          if (ancestor.type.name === 'bulletList' || ancestor.type.name === 'orderedList') {
            // Direct list (no listItem wrapper) — shouldn't normally happen
            break;
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
  editingRangeId: string | null,
  callbacks: ActionCallbacks,
  markdownToJSON?: MarkdownToJSONFn
): DecorationSet {
  const decorations: Decoration[] = [];
  const schema = doc.type.schema;

  for (const range of ranges) {
    if (range.from < 0 || range.to > doc.content.size) continue;
    const isFocused = range.id === focusedId;
    const isEditing = range.id === editingRangeId;
    const focusedSuffix = isFocused ? ' suggestion-focused' : '';

    // Loading state: show skeleton in place of the green/red blocks
    if (range.decision === 'loading') {
      const blocks = findBlockNodesInRange(doc, range.from, range.to);
      // Estimate line count from the proposed text to size the skeleton
      const lineCount = range.proposedText
        .split('\n')
        .filter((l) => l.trim().length > 0).length || 3;
      const firstBlock = blocks[0];
      if (firstBlock) {
        const widgetPos = resolveTopLevelPos(doc, firstBlock.pos);
        decorations.push(
          Decoration.widget(
            widgetPos,
            createSkeletonWidget(lineCount),
            { side: -1, key: `skeleton-${range.id}` }
          )
        );
      }
      // Dim the original content while loading
      for (const block of blocks) {
        decorations.push(
          Decoration.node(block.pos, block.end, {
            class: 'suggestion-loading-content',
          })
        );
      }
      continue;
    }

    switch (range.type) {
      case 'modify': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to);

        // Place widget at the top-level (depth 1) so it spans full editor width
        if (blocks.length > 0) {
          const firstBlock = blocks[0];
          if (firstBlock) {
            const widgetPos = resolveTopLevelPos(doc, firstBlock.pos);
            decorations.push(
              Decoration.widget(
                widgetPos,
                createInsertionWidget(range.id, range.proposedText, schema, callbacks, isEditing, markdownToJSON),
                { side: -1, key: `insert-${range.id}-${isEditing ? 'edit' : 'view'}-${range.proposedText.length}` }
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
        const widgetPos = resolveTopLevelPos(doc, range.from);
        decorations.push(
          Decoration.widget(
            widgetPos,
            createInsertionWidget(range.id, range.proposedText, schema, callbacks, isEditing, markdownToJSON),
            { side: 1, key: `insert-${range.id}-${isEditing ? 'edit' : 'view'}-${range.proposedText.length}` }
          )
        );
        break;
      }

      case 'delete': {
        const blocks = findBlockNodesInRange(doc, range.from, range.to);

        // Action bar widget before the deleted blocks
        const firstDeleteBlock = blocks[0];
        if (firstDeleteBlock) {
          const widgetPos = resolveTopLevelPos(doc, firstDeleteBlock.pos);
          decorations.push(
            Decoration.widget(
              widgetPos,
              (_view: EditorView) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'suggestion-change-group suggestion-delete-group';
                wrapper.appendChild(createActionBar(range.id, callbacks, isEditing));
                return wrapper;
              },
              { side: -1, key: `delete-actions-${range.id}-${isEditing ? 'edit' : 'view'}` }
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
        onEditClick: undefined,
        onFeedbackSubmit: undefined,
        onFeedbackCancel: undefined,
        markdownToJSON: undefined,
      };
    },

    addProseMirrorPlugins() {
      const extensionOptions = this.options;
      const extensionCallbacks: ActionCallbacks = {
        onAccept: extensionOptions.onAccept,
        onReject: extensionOptions.onReject,
        onEditClick: extensionOptions.onEditClick,
        onFeedbackSubmit: extensionOptions.onFeedbackSubmit,
        onFeedbackCancel: extensionOptions.onFeedbackCancel,
      };

      return [
        new Plugin<SuggestionsPluginState>({
          key: suggestionsPluginKey,

          state: {
            init(): SuggestionsPluginState {
              return {
                ranges: [],
                focusedId: null,
                editingRangeId: null,
                decorations: DecorationSet.empty,
              };
            },

            apply(tr, state): SuggestionsPluginState {
              const meta = tr.getMeta(suggestionsPluginKey) as
                | { ranges: SuggestionRange[]; focusedId: string | null; editingRangeId?: string | null }
                | undefined;

              if (meta !== undefined) {
                const editingRangeId = meta.editingRangeId ?? null;
                const pendingRanges = meta.ranges.filter(
                  (r) => r.decision === 'pending' || r.decision === 'loading'
                );
                let decorations: DecorationSet;
                try {
                  decorations = buildDecorations(
                    tr.doc,
                    pendingRanges,
                    meta.focusedId,
                    editingRangeId,
                    extensionCallbacks,
                    extensionOptions.markdownToJSON
                  );
                } catch (err) {
                  console.error('[SuggestionsPlugin] buildDecorations failed:', err);
                  decorations = DecorationSet.empty;
                }
                return {
                  ranges: meta.ranges,
                  focusedId: meta.focusedId,
                  editingRangeId,
                  decorations,
                };
              }

              if (tr.docChanged) {
                return {
                  ranges: state.ranges,
                  focusedId: state.focusedId,
                  editingRangeId: state.editingRangeId,
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
            editable() {
              // Editability is controlled by the TipTap editor's readOnly prop
              // and toggled by the React component when suggestions are active.
              return true;
            },
          },
        }),
      ];
    },
  });
