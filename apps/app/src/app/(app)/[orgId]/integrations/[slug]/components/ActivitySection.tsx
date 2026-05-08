'use client';

import { api } from '@/lib/api-client';
import { Avatar, AvatarFallback } from '@trycompai/ui/avatar';
import { Section, Text, HStack, Stack } from '@trycompai/design-system';
import { Activity } from '@trycompai/design-system/icons';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';
import useSWR from 'swr';

interface ActivityEntry {
  id: string;
  type: 'scan' | 'remediation' | 'rollback' | 'service_change';
  description: string;
  userId: string | null;
  userName: string | null;
  status: 'success' | 'failed' | 'info';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivitySectionProps {
  connectionId: string;
}

const getInitials = (name: string | null) =>
  name
    ? name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)
    : 'S';

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const displayName = entry.userName ?? 'System';
  const timeAgo = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });

  return (
    <HStack gap="sm" align="center">
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarFallback className="text-[9px]">
          {getInitials(entry.userName)}
        </AvatarFallback>
      </Avatar>

      <Text size="sm" as="span">
        <Text as="span" size="sm" weight="medium">{displayName}</Text>
        {' '}
        <Text as="span" size="sm" variant="muted">{entry.description}</Text>
      </Text>

      <div className="shrink-0 ml-auto">
        <Text size="xs" variant="muted" font="mono">{timeAgo}</Text>
      </div>
    </HStack>
  );
}

export function ActivitySection({ connectionId }: ActivitySectionProps) {
  const { data, isLoading } = useSWR<ActivityEntry[]>(
    connectionId ? ['cloud-activity', connectionId] : null,
    async () => {
      const response = await api.get<{ data: ActivityEntry[] }>(
        `/v1/cloud-security/activity?connectionId=${connectionId}&take=50`,
      );
      if (response.error) throw new Error(response.error);
      return response.data?.data ?? [];
    },
    { revalidateOnFocus: false, dedupingInterval: 5000 },
  );

  const entries = data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Section title="Recent Activity">
        <div className="py-8">
          <Stack gap="sm" align="center">
            <Activity size={20} className="text-muted-foreground/50" />
            <Text size="xs" variant="muted">
              Activity will appear here when scans or remediations are run
            </Text>
          </Stack>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Recent Activity">
      <div className="divide-y [&>*]:py-2.5">
        {entries.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </div>
    </Section>
  );
}
