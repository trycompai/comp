'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { Section, Stack, Switch, Text } from '@trycompai/design-system';
import { OffboardingChecklistSettings } from './OffboardingChecklistSettings';

interface PeopleSettingsProps {
  backgroundCheckStepEnabled: boolean;
}

export function PeopleSettings({
  backgroundCheckStepEnabled: initialEnabled,
}: PeopleSettingsProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('organization', 'update');

  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (next: boolean) => {
    const previous = enabled;
    setEnabled(next);
    setSaving(true);

    const res = await apiClient.patch('/v1/organization', {
      backgroundCheckStepEnabled: next,
    });

    setSaving(false);

    if (res.error) {
      setEnabled(previous);
      toast.error('Failed to update background check setting');
      return;
    }

    toast.success(
      next
        ? 'Background checks now required'
        : 'Background checks bypassed for your organization',
    );
  };

  return (
    <Stack gap="lg">
      <Section title="Background checks">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="flex-1">
            <Text weight="medium">Require background checks</Text>
            <Text size="sm" variant="muted">
              When off, your organization&apos;s members do not need to pass a
              background check to count toward people completion. Individual
              members can also be exempted from their profile.
            </Text>
          </div>
          <Switch
            checked={enabled}
            disabled={saving || !canUpdate}
            onCheckedChange={handleToggle}
            aria-label="Require background checks"
          />
        </div>
      </Section>
      <OffboardingChecklistSettings />
    </Stack>
  );
}
