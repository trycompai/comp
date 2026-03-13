import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';

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

interface CallbackOptions {
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onFeedback?: (id: string) => void;
}

function createGutterWidget(
  rangeId: string,
  callbacks: CallbackOptions
): (_view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'suggestion-gutter';
    wrapper.dataset.suggestionId = rangeId;

    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'suggestion-gutter-btn suggestion-accept-btn';
    acceptBtn.textContent = '\u2713';
    acceptBtn.title = 'Accept change';
    acceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onAccept?.(rangeId);
    });

    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'suggestion-gutter-btn suggestion-reject-btn';
    rejectBtn.textContent = '\u2715';
    rejectBtn.title = 'Reject change';
    rejectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onReject?.(rangeId);
    });

    const feedbackBtn = document.createElement('button');
    feedbackBtn.className = 'suggestion-gutter-btn suggestion-feedback-btn';
    feedbackBtn.textContent = '\u270E';
    feedbackBtn.title = 'Give feedback';
    feedbackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      callbacks.onFeedback?.(rangeId);
    });

    wrapper.appendChild(acceptBtn);
    wrapper.appendChild(rejectBtn);
    wrapper.appendChild(feedbackBtn);

    return wrapper;
  };
}

function createInsertionWidget(
  text: string
): (_view: EditorView) => HTMLElement {
  return (_view: EditorView) => {
    const span = document.createElement('span');
    span.className = 'suggestion-insert';
    span.textContent = text;
    return span;
  };
}

/**
 * Parse a line of markdown into a ProseMirror node using the editor schema.
 * Handles headings (##), list items (-), and plain paragraphs.
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

function createNewSectionWidget(
  text: string
): (view: EditorView) => HTMLElement {
  return (view: EditorView) => {
    const div = document.createElement('div');
    div.className = 'suggestion-new-section';

    try {
      const { schema } = view.state;
      const pmNodes = markdownLinesToNodes(text, schema);
      const serializer = DOMSerializer.fromSchema(schema);

      for (const node of pmNodes) {
        const dom = serializer.serializeNode(node);
        div.appendChild(dom);
      }
    } catch {
      // Fallback to plain text if parsing fails
      div.textContent = text;
    }

    return div;
  };
}

function buildDecorations(
  doc: ProseMirrorNode,
  ranges: SuggestionRange[],
  focusedId: string | null,
  callbacks: CallbackOptions
): DecorationSet {
  const decorations: Decoration[] = [];

  for (const range of ranges) {
    if (range.from < 0 || range.to > doc.content.size) continue;
    const isFocused = range.id === focusedId;
    const focusedSuffix = isFocused ? ' suggestion-focused' : '';

    switch (range.type) {
      case 'modify': {
        // Node decoration for the modified block
        const resolvedFrom = doc.resolve(range.from);
        const resolvedTo = doc.resolve(range.to);
        const nodeStart = resolvedFrom.before(resolvedFrom.depth);
        const nodeEnd = resolvedTo.after(resolvedTo.depth);

        if (nodeStart >= 0 && nodeEnd <= doc.content.size) {
          decorations.push(
            Decoration.node(nodeStart, nodeEnd, {
              class: `suggestion-modified${focusedSuffix}`,
            })
          );
        }

        // Inline decorations for segments
        let pos = range.from;
        for (const segment of range.segments) {
          if (segment.type === 'delete') {
            const end = Math.min(pos + segment.text.length, range.to);
            decorations.push(
              Decoration.inline(pos, end, {
                class: 'suggestion-delete',
              })
            );
            pos = end;
          } else if (segment.type === 'insert') {
            decorations.push(
              Decoration.widget(pos, createInsertionWidget(segment.text), {
                side: 1,
              })
            );
          } else {
            // unchanged
            pos += segment.text.length;
          }
        }
        break;
      }

      case 'insert': {
        decorations.push(
          Decoration.widget(
            range.from,
            createNewSectionWidget(range.proposedText),
            { side: 1 }
          )
        );
        break;
      }

      case 'delete': {
        const resolvedFrom = doc.resolve(range.from);
        const resolvedTo = doc.resolve(range.to);
        const nodeStart = resolvedFrom.before(resolvedFrom.depth);
        const nodeEnd = resolvedTo.after(resolvedTo.depth);

        if (nodeStart >= 0 && nodeEnd <= doc.content.size) {
          decorations.push(
            Decoration.node(nodeStart, nodeEnd, {
              class: `suggestion-deleted-section${focusedSuffix}`,
            })
          );
        }
        break;
      }
    }

    // Gutter widget for each range
    decorations.push(
      Decoration.widget(range.from, createGutterWidget(range.id, callbacks), {
        side: -1,
        key: `gutter-${range.id}`,
      })
    );
  }

  return DecorationSet.create(doc, decorations);
}

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
      const { onAccept, onReject, onFeedback } = this.options;

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
                  meta.focusedId,
                  { onAccept, onReject, onFeedback }
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
            attributes(state): Record<string, string> {
              const pluginState = suggestionsPluginKey.getState(state);
              const hasPending = pluginState?.ranges.some(
                (r) => r.decision === 'pending'
              );
              return hasPending ? { class: 'has-suggestions' } : {};
            },
          },
        }),
      ];
    },
  });
