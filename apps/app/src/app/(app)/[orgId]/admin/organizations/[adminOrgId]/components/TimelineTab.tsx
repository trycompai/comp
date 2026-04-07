'use client';

import { useAdminOrgTimelines } from '@/hooks/use-admin-timelines';
import { Stack, Text } from '@trycompai/design-system';
import { TimelineCard } from './TimelineCard';

interface TimelineTabProps {
  orgId: string;
}

export function TimelineTab({ orgId }: TimelineTabProps) {
  const { timelines, isLoading, mutate } = useAdminOrgTimelines(orgId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading timelines...
      </div>
    );
  }

  if (timelines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
        No timelines found for this organization.
      </div>
    );
  }

  return (
    <Stack gap="lg">
      <Text size="sm" variant="muted">
        {timelines.length} timeline{timelines.length !== 1 ? 's' : ''}
      </Text>
      {timelines.map((timeline) => (
        <TimelineCard
          key={timeline.id}
          timeline={timeline}
          orgId={orgId}
          onMutate={mutate}
        />
      ))}
    </Stack>
  );
}
