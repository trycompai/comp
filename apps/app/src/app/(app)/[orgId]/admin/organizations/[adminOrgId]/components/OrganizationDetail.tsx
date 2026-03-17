'use client';

import { apiClient } from '@/lib/api-client';
import { RecentAuditLogs } from '@/components/RecentAuditLogs';
import type { AuditLogWithRelations } from '@/hooks/use-audit-logs';
import {
  Badge,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import useSWR from 'swr';

interface AdminOrgDetail {
  id: string;
  name: string;
  logo: string | null;
  createdAt: string;
  onboardingCompleted: boolean;
  members: { id: string }[];
}

export function OrganizationDetail({
  org,
  hasAccess,
}: {
  org: AdminOrgDetail;
  currentOrgId: string;
  hasAccess: boolean;
}) {
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
        <InfoCard
          label="Created"
          value={new Date(org.createdAt).toLocaleDateString()}
        />
        <InfoCard
          label="Onboarding"
          value={org.onboardingCompleted ? 'Completed' : 'Pending'}
        />
      </div>

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
