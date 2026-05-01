'use client';

import { Button, Text } from '@trycompai/design-system';
import { Renew } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!saving) {
      setDraft(value);
    }
  }, [value, saving]);

  const isDirty = draft.trim() !== (value ?? '').trim();
  const wordCount = countWords(draft);
  const charCount = draft.length;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled || saving}
        placeholder="Describe how this risk is being treated — the concrete controls, owners, and timelines."
        className="mt-4 block min-h-[200px] w-full resize-y border-0 border-t border-border bg-transparent py-3.5 text-sm leading-[1.55] text-foreground outline-none disabled:opacity-60"
      />
      <div className="flex items-center gap-2 border-t border-border pt-2.5">
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
          {draft.trim() ? 'Regenerate with AI' : 'Generate treatment plan'}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={disabled || !isDirty || saving}
          loading={saving}
        >
          Save
        </Button>
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
