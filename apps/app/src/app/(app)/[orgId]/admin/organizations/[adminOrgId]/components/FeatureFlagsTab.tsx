'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Badge,
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  SettingGroup,
  SettingRow,
  Stack,
  Switch,
  Text,
} from '@trycompai/design-system';
import { Renew, Search } from '@trycompai/design-system/icons';
import {
  setAdminOrgFeatureFlag,
  useAdminOrgFeatureFlags,
  type AdminOrgFeatureFlag,
} from '@/hooks/use-admin-feature-flags';

interface FeatureFlagsTabProps {
  orgId: string;
}

export function FeatureFlagsTab({ orgId }: FeatureFlagsTabProps) {
  const { flags, isLoading, error, mutate } = useAdminOrgFeatureFlags(orgId);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFlags = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return flags;
    return flags.filter(
      (f) =>
        f.key.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q),
    );
  }, [flags, searchTerm]);

  const handleToggle = async (flag: AdminOrgFeatureFlag, enabled: boolean) => {
    setUpdatingKey(flag.key);

    // Snapshot previous state so we can roll back on error.
    const previous = flags;

    // Optimistic update — don't revalidate (PostHog has write-propagation lag).
    mutate(
      (prev) =>
        (prev ?? []).map((f) => (f.key === flag.key ? { ...f, enabled } : f)),
      { revalidate: false },
    );

    try {
      await setAdminOrgFeatureFlag({ orgId, flagKey: flag.key, enabled });
      toast.success(`"${flag.name}" ${enabled ? 'enabled' : 'disabled'} for this organization`);
      // Trust the write. Skip revalidation — PostHog isFeatureEnabled may lag
      // behind groupIdentify and temporarily return the old value.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update feature flag');
      // Roll back to the snapshot.
      mutate(previous, { revalidate: false });
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await mutate();
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading feature flags…
      </div>
    );
  }

  if (error) {
    return (
      <Stack gap="xs">
        <Text weight="semibold">Failed to load feature flags</Text>
        <Text variant="muted">
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </Stack>
    );
  }

  if (flags.length === 0) {
    return (
      <Stack gap="xs">
        <Text weight="semibold">No feature flags found</Text>
        <Text variant="muted">
          Create a feature flag in PostHog and set <code>POSTHOG_PERSONAL_API_KEY</code> and{' '}
          <code>POSTHOG_PROJECT_ID</code> on the API to manage it here.
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-sm">
          <InputGroup>
            <InputGroupAddon>
              <Search size={16} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search flags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          loading={refreshing}
        >
          <Renew />
          Refresh from PostHog
        </Button>
      </div>
      {filteredFlags.length === 0 ? (
        <Text variant="muted">No flags match your search.</Text>
      ) : (
        <SettingGroup>
          {filteredFlags.map((flag) => (
            <SettingRow
              key={flag.key}
              size="lg"
              label={flag.key}
              description={
                flag.description ||
                (flag.active ? undefined : 'Inactive in PostHog')
              }
            >
              <div className="flex items-center gap-2">
                {!flag.active && <Badge variant="outline">Inactive</Badge>}
                <Switch
                  checked={flag.enabled}
                  // Disable every switch while any flag is being updated —
                  // prevents overlapping PATCHes where a late rollback could
                  // overwrite a newer successful toggle.
                  disabled={!flag.active || updatingKey !== null}
                  onCheckedChange={(checked) => handleToggle(flag, checked)}
                />
              </div>
            </SettingRow>
          ))}
        </SettingGroup>
      )}
    </Stack>
  );
}
