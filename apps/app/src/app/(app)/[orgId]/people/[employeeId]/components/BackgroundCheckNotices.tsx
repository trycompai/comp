'use client';

import { Switch, Text } from '@trycompai/design-system';
import { Information } from '@trycompai/design-system/icons';

export function BackgroundCheckExemptToggle({
  exempt,
  saving,
  canUpdate,
  onToggle,
}: {
  exempt: boolean;
  saving: boolean;
  canUpdate: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1">
        <Text weight="medium">Exempt this employee from background check</Text>
        <Text size="sm" variant="muted">
          When on, this employee won&apos;t be required to pass a background check to count toward
          people completion.
        </Text>
      </div>
      <Switch
        checked={exempt}
        disabled={saving || !canUpdate}
        onCheckedChange={onToggle}
        aria-label="Exempt this employee from background check"
      />
    </div>
  );
}

export function BackgroundCheckNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/30 p-4">
      <span className="mt-0.5 shrink-0 text-muted-foreground">
        <Information size={20} />
      </span>
      <div>
        <Text weight="medium">{title}</Text>
        <Text size="sm" variant="muted">
          {body}
        </Text>
      </div>
    </div>
  );
}

export function BackgroundCheckDisabledNotice() {
  return (
    <BackgroundCheckNotice
      title="Background checks are not required for your organization"
      body="Background checks are disabled for your organization. This can be changed in People > Settings. Existing background-check requests, if any, remain accessible from your billing portal."
    />
  );
}
