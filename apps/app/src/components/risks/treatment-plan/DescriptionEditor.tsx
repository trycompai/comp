'use client';

import { Button, Text } from '@trycompai/design-system';
import { Edit, Renew } from '@trycompai/design-system/icons';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface DescriptionEditorProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  regenerating: boolean;
  disabled?: boolean;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).length;
}

export function DescriptionEditor({
  value,
  onSave,
  onRegenerate,
  regenerating,
  disabled,
}: DescriptionEditorProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  // Mode: 'preview' renders markdown, 'edit' shows the auto-growing textarea.
  // We default to 'edit' when the value is empty (nothing to preview yet) and
  // stay in 'edit' when an AI regeneration completes with new content so the
  // user immediately sees what was drafted.
  const [mode, setMode] = useState<'preview' | 'edit'>(
    value.trim().length > 0 ? 'preview' : 'edit',
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!saving) {
      setDraft(value);
    }
  }, [value, saving]);

  // When a fresh value arrives from upstream (regenerate, server update) and
  // we're not actively editing, drop back to preview.
  useEffect(() => {
    if (mode === 'edit' || saving) return;
    if (value.trim().length === 0) setMode('edit');
  }, [value, mode, saving]);

  // Auto-grow the textarea to fit content. Run on draft change AND on mode
  // change (so switching from preview to edit sizes correctly on first paint).
  useLayoutEffect(() => {
    if (mode !== 'edit') return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 200)}px`;
  }, [draft, mode]);

  const isDirty = draft.trim() !== (value ?? '').trim();
  const wordCount = countWords(draft);
  const charCount = draft.length;
  const hasValue = value.trim().length > 0;

  const handleSave = async () => {
    if (!isDirty) {
      setMode('preview');
      return;
    }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setMode('preview');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft(value);
    setMode('preview');
  };

  return (
    <div className="flex flex-col">
      {mode === 'preview' && hasValue ? (
        <div className="mt-4 border-t border-border pt-4">
          <MarkdownPreview content={value} />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled || saving}
          placeholder="Describe how this risk is being treated — concrete controls, owners, timelines. Markdown supported."
          className="mt-4 block w-full overflow-hidden border-0 border-t border-border bg-transparent py-3.5 text-sm leading-[1.55] text-foreground outline-none disabled:opacity-60"
          style={{ resize: 'none', minHeight: 200 }}
        />
      )}
      <div className={cn('flex items-center gap-2 border-t border-border pt-2.5', !hasValue && mode === 'preview' && 'mt-4')}>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {wordCount} {wordCount === 1 ? 'word' : 'words'} · {charCount}{' '}
          {charCount === 1 ? 'char' : 'chars'}
        </span>
        <span className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled || regenerating}
          loading={regenerating}
          iconLeft={<Renew aria-hidden="true" />}
        >
          {hasValue ? 'Regenerate with AI' : 'Generate treatment plan'}
        </Button>
        {mode === 'preview' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode('edit')}
            disabled={disabled}
            iconLeft={<Edit aria-hidden="true" />}
          >
            Edit
          </Button>
        ) : (
          <>
            {hasValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={disabled || saving}
              >
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={disabled || (!isDirty && !hasValue) || saving}
              loading={saving}
            >
              Save
            </Button>
          </>
        )}
      </div>
      {regenerating && (
        <div className="mt-2">
          <Text size="xs" variant="muted">
            AI is drafting — this may take up to a minute. You can keep editing; your edits will
            win if they save before the AI finishes.
          </Text>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight markdown preview tuned for treatment-plan prose. Headings,
 * bullets, ordered lists, links, bold/italic, code spans. No raw HTML or
 * complex blocks — the AI prompts already shape output to this.
 */
function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose-sm max-w-none text-sm leading-[1.65] text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="my-2 first:mt-0 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          h1: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-3 mb-1.5 text-sm font-semibold first:mt-0">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-3 mb-1 text-sm font-semibold first:mt-0">
              {children}
            </h5>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
