'use client';

import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';
import { apiClient } from '@/lib/api-client';
import { Badge, Section, Stack, Switch, Text } from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

interface AdminOrgDetail {
  id: string;
  name: string;
  logo: string | null;
  createdAt: string;
  onboardingCompleted: boolean;
  members: { id: string }[];
  backgroundCheckStepEnabled: boolean;
  isInternal: boolean;
}

export function OrganizationDetail({
  org,
  hasAccess,
}: {
  org: AdminOrgDetail;
  currentOrgId: string;
  hasAccess: boolean;
}) {
  const [bgCheckEnabled, setBgCheckEnabled] = useState(org.backgroundCheckStepEnabled);
  const [savingBgCheck, setSavingBgCheck] = useState(false);
  const [isInternal, setIsInternal] = useState(org.isInternal);
  const [savingInternal, setSavingInternal] = useState(false);

  const handleToggleBgCheck = async (next: boolean) => {
    const previous = bgCheckEnabled;
    setBgCheckEnabled(next);
    setSavingBgCheck(true);

    const res = await apiClient.patch(`/v1/admin/organizations/${org.id}`, {
      backgroundCheckStepEnabled: next,
    });

    setSavingBgCheck(false);

    if (res.error) {
      setBgCheckEnabled(previous);
      toast.error('Failed to update background check setting');
      return;
    }

    toast.success(
      next ? 'Background checks now required' : 'Background checks bypassed for this organization',
    );
  };

  const handleToggleInternal = async (next: boolean) => {
    const previous = isInternal;
    setIsInternal(next);
    setSavingInternal(true);

    const res = await apiClient.patch(`/v1/admin/organizations/${org.id}`, {
      isInternal: next,
    });

    setSavingInternal(false);

    if (res.error) {
      setIsInternal(previous);
      toast.error('Failed to update internal-organization setting');
      return;
    }

    toast.success(
      next
        ? 'Marked as internal — platform admins can now participate here'
        : 'Unmarked as internal — platform admins are excluded again',
    );
  };

  const { data: logs = [], isLoading } = useSWR(
    `/v1/admin/organizations/${org.id}/audit-logs`,
    async (url: string) => {
      const res = await apiClient.get<{ data: AuditLogWithRelations[] }>(url);
      if (res.error || !res.data?.data) return [];
      return res.data.data;
    },
    { revalidateOnFocus: true, refreshInterval: 15_000 },
  );

  return (
    <Stack gap="lg">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <InfoCard
          label="Status"
          value={hasAccess ? 'Active' : 'Inactive'}
          variant={hasAccess ? 'default' : 'destructive'}
        />
        <InfoCard label="Members" value={String(org.members.length)} />
        <InfoCard label="Created" value={new Date(org.createdAt).toLocaleDateString()} />
        <InfoCard label="Onboarding" value={org.onboardingCompleted ? 'Completed' : 'Pending'} />
      </div>

      <Section title="Compliance settings">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="flex-1">
            <Text weight="medium">Require background checks</Text>
            <Text size="sm" variant="muted">
              When off, this org&apos;s members do not need to pass a background check to count
              toward people completion. Existing requests stay accessible.
            </Text>
          </div>
          <Switch
            checked={bgCheckEnabled}
            disabled={savingBgCheck}
            onCheckedChange={handleToggleBgCheck}
            aria-label="Require background checks"
          />
        </div>
      </Section>

      <Section title="Platform settings">
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="flex-1">
            <Text weight="medium">Internal organization</Text>
            <Text size="sm" variant="muted">
              For Comp AI-operated orgs only. When on, platform admins are treated as real members
              here — assignable, counted in compliance, and notified. Leave off for every customer
              organization.
            </Text>
          </div>
          <Switch
            checked={isInternal}
            disabled={savingInternal}
            onCheckedChange={handleToggleInternal}
            aria-label="Internal organization"
          />
        </div>
      </Section>

      {isLoading ? (
        <Section title="Recent Activity">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <RecentAuditLogs logs={logs} title="Recent Activity" />
      )}
    </Stack>
  );
}

function InfoCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: 'default' | 'destructive';
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <Text size="xs" variant="muted">
        {label}
      </Text>
      <div className="mt-1">
        {variant ? (
          <Badge variant={variant}>{value}</Badge>
        ) : (
          <Text size="lg" weight="semibold">
            {value}
          </Text>
        )}
      </div>
    </div>
  );
}
