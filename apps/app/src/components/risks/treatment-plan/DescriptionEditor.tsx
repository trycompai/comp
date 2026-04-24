'use client';

import { Button, HStack, Stack, Text } from '@trycompai/design-system';
import { useEffect, useState } from 'react';

interface DescriptionEditorProps {
  value: string;
  onSave: (next: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  regenerating: boolean;
  disabled?: boolean;
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
    <Stack gap="sm">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled || saving}
        placeholder="Describe how this risk is being treated — the concrete controls, owners, and timelines."
        rows={8}
        className="focus:border-primary w-full rounded-md border bg-transparent p-3 text-sm outline-none"
      />
      <HStack gap="sm" justify="end">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled || regenerating}
          loading={regenerating}
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
      </HStack>
      {regenerating && (
        <Text size="xs" variant="muted">
          AI is drafting — this may take up to a minute. You can keep editing; your edits will win
          if they save before the AI finishes.
        </Text>
      )}
    </Stack>
  );
}
