'use client';

import { Button } from '@trycompai/design-system';
import { Edit, Renew } from '@trycompai/design-system/icons';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
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
  /**
   * The trigger.dev run handle for an in-flight regeneration. When set, the
   * editor subscribes via `useRealtimeRun`, renders status-specific progress
   * copy, and notifies the parent via `onRegenSettled` when the run reaches
   * a terminal state. Null/undefined while no regen is active.
   */
  regenRun?: { runId: string; publicAccessToken: string } | null;
  /** Called once the regeneration run terminates (success or failure). */
  onRegenSettled?: (result: { success: boolean; reason?: string }) => void;
}

const TERMINAL_FAILURE_STATUSES = new Set([
  'FAILED',
  'CANCELED',
  'CRASHED',
  'SYSTEM_FAILURE',
  'EXPIRED',
  'TIMED_OUT',
]);

/**
 * Cap (in px) for both the markdown preview and the auto-growing textarea.
 * Past this height, the body scrolls internally so the Treatment plan column
 * stays roughly aligned with the Strategy and Linked Work columns instead
 * of pushing the whole row downward when AI emits a long plan.
 */
const TEXTAREA_MAX_PX = 480;

function regenStatusCopy(status: string | undefined): { headline: string; sub: string } {
  if (!status || status === 'WAITING_FOR_DEPLOY') {
    return {
      headline: 'Starting AI scan…',
      sub: 'Allocating compute capacity.',
    };
  }
  if (status === 'QUEUED' || status === 'DELAYED') {
    return {
      headline: 'Queued — waiting to start…',
      sub: 'Your regeneration will begin in a moment.',
    };
  }
  if (status === 'INTERRUPTED' || status === 'WAITING_TO_RESUME') {
    return {
      headline: 'Resuming…',
      sub: 'Picking up where the run left off.',
    };
  }
  return {
    headline: 'AI is drafting your treatment plan…',
    sub: 'Reading linked controls and tasks, then writing each citation.',
  };
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
  regenRun,
  onRegenSettled,
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

  // Resync the draft from upstream `value` ONLY when the user isn't
  // actively editing. Without the `mode === 'edit'` guard, a background
  // SWR revalidation, AI regeneration, or any other prop change would
  // wipe whatever the user was typing. (Cubic finding on PR #2671.)
  useEffect(() => {
    if (saving) return;
    if (mode === 'edit') return;
    setDraft(value);
  }, [value, saving, mode]);

  // When a fresh value arrives from upstream (regenerate, server update) and
  // we're not actively editing, drop back to preview.
  useEffect(() => {
    if (mode === 'edit' || saving) return;
    if (value.trim().length === 0) setMode('edit');
  }, [value, mode, saving]);

  // Auto-grow the textarea to fit content, but cap at TEXTAREA_MAX_PX so a
  // long draft doesn't stretch the Treatment plan column past the Strategy
  // / Linked Work columns. Internal scroll kicks in past the cap.
  useLayoutEffect(() => {
    if (mode !== 'edit') return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.max(Math.min(el.scrollHeight, TEXTAREA_MAX_PX), 200);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_PX ? 'auto' : 'hidden';
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
        <div
          className="mt-4 overflow-y-auto border-t border-border pt-4"
          style={{ maxHeight: TEXTAREA_MAX_PX }}
        >
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
      {(regenerating || regenRun) && (
        <RegenProgress
          regenRun={regenRun ?? null}
          onSettled={onRegenSettled}
          /* While `regenerating` is true but no run handle yet, the POST
             that triggers the task is in flight — show a generic starter
             until the runId arrives. */
          fallbackHeadline="Starting AI scan…"
        />
      )}
    </div>
  );
}

function RegenProgress({
  regenRun,
  onSettled,
  fallbackHeadline,
}: {
  regenRun: { runId: string; publicAccessToken: string } | null;
  onSettled?: (result: { success: boolean; reason?: string }) => void;
  fallbackHeadline: string;
}) {
  const { run } = useRealtimeRun(regenRun?.runId ?? '', {
    accessToken: regenRun?.publicAccessToken ?? '',
    enabled: !!regenRun,
  });
  const status = run?.status;

  useEffect(() => {
    if (!status) return;
    if (status === 'COMPLETED') {
      onSettled?.({ success: true });
      return;
    }
    if (TERMINAL_FAILURE_STATUSES.has(status)) {
      const reasons: Record<string, string> = {
        FAILED: 'The AI run hit an error.',
        CANCELED: 'The AI run was canceled.',
        CRASHED: 'The worker crashed mid-run.',
        SYSTEM_FAILURE: 'A system error stopped the run.',
        EXPIRED: 'The run expired before it could start.',
        TIMED_OUT: 'The run took too long and timed out.',
      };
      onSettled?.({ success: false, reason: reasons[status] ?? 'The AI run failed.' });
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const { headline, sub } = regenRun
    ? regenStatusCopy(status)
    : { headline: fallbackHeadline, sub: 'This may take up to a minute.' };

  return (
    <div
      className="mt-3 flex items-start gap-2 rounded-md border border-border bg-primary/[0.04] px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <div className="text-[13px] text-foreground">{headline}</div>
        <div className="mt-0.5 text-[11px] leading-[1.5] text-muted-foreground">{sub}</div>
        <div className="mt-1 text-[11px] leading-[1.5] text-muted-foreground">
          You can keep editing; your edits will win if they save before the AI finishes.
        </div>
      </div>
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
