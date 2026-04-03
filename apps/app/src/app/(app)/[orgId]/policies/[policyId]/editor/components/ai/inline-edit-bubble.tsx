'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { MagicWand } from '@trycompai/design-system/icons';
import { markdownToTipTapJSON } from './markdown-utils';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

interface InlineEditBubbleProps {
  editor: Editor;
  policyId: string;
  disabled?: boolean;
}

export function InlineEditBubble({ editor, policyId, disabled }: InlineEditBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) return;

    // Resolve to top-level (depth 1) block boundaries.
    // This ensures we always replace complete top-level nodes
    // (paragraphs, headings, entire <ul> elements), never partial
    // inline content or listItem internals.
    const $from = editor.state.doc.resolve(from);
    const $to = editor.state.doc.resolve(to);
    const replaceFrom = $from.before(1);
    const replaceTo = $to.after(1);

    // Extract selected content as markdown to preserve structure
    const selectedMarkdown = sliceToMarkdown(editor.state.doc, replaceFrom, replaceTo);

    setIsLoading(true);

    try {
      const res = await fetch(`/api/policies/${policyId}/edit-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sectionText: selectedMarkdown,
          feedback: input,
        }),
      });

      if (!res.ok) throw new Error('Failed');
      const { updatedText } = (await res.json()) as { updatedText: string };

      // Convert AI response back to TipTap nodes and replace the block range
      const jsonNodes = markdownToTipTapJSON(updatedText);
      const pmNodes = jsonNodes.map((json) =>
        editor.state.schema.nodeFromJSON(json),
      );

      const { tr } = editor.state;
      tr.replaceWith(replaceFrom, replaceTo, pmNodes);
      editor.view.dispatch(tr);

      setInput('');
      setIsEditing(false);
    } catch (err) {
      console.error('Inline edit failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [editor, input, isLoading, policyId]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setInput('');
  }, []);

  if (disabled) return null;

  const shouldShow = ({ editor: e }: { editor: Editor }) => {
    const { from, to } = e.state.selection;
    return from !== to && e.isEditable;
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      options={{
        onHide: () => {
          setIsEditing(false);
          setInput('');
        },
      }}
    >
      <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 shadow-lg">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <MagicWand size={14} className="shrink-0 text-primary" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleClose();
                }
              }}
              placeholder="How should this change?"
              disabled={isLoading}
              className="w-48 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {isLoading ? (
              <svg
                className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                <kbd className="text-[10px] font-normal text-muted-foreground">⌘↵</kbd>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 hover:text-foreground"
          >
            <MagicWand size={14} className="text-primary" />
            <span>AI Edit</span>
          </button>
        )}
      </div>
    </BubbleMenu>
  );
}

/**
 * Convert a range of ProseMirror nodes to markdown so the AI
 * receives the content with structure (headings, bullets) intact.
 */
function sliceToMarkdown(doc: ProseMirrorNode, from: number, to: number): string {
  const lines: string[] = [];

  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isBlock && !node.isTextblock && node.type.name !== 'doc') {
      return true;
    }

    if (node.type.name === 'heading') {
      const level = (node.attrs as { level?: number }).level ?? 2;
      lines.push('#'.repeat(level) + ' ' + node.textContent);
      return false;
    }

    if (node.type.name === 'paragraph') {
      const $pos = doc.resolve(pos);
      let insideListItem = false;
      for (let d = $pos.depth; d >= 0; d--) {
        if ($pos.node(d).type.name === 'listItem') {
          insideListItem = true;
          break;
        }
      }
      if (insideListItem) {
        lines.push('- ' + node.textContent);
      } else {
        lines.push(node.textContent);
      }
      return false;
    }

    return true;
  });

  return lines.join('\n');
}
