'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAdminOrgTimelines } from '@/hooks/use-admin-timelines';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Reset } from '@trycompai/design-system/icons';
import { TimelineCard } from './TimelineCard';

interface TimelineTabProps {
  orgId: string;
}

export function TimelineTab({ orgId }: TimelineTabProps) {
  const { timelines, isLoading, mutate } = useAdminOrgTimelines(orgId);
  const [recreating, setRecreating] = useState(false);
  const [recreateOpen, setRecreateOpen] = useState(false);

  const handleRecreate = async () => {
    setRecreateOpen(false);
    setRecreating(true);
    const res = await api.post(
      `/v1/admin/organizations/${orgId}/timelines/recreate`,
    );
    setRecreating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('All timelines recreated from latest templates');
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading timelines...
      </div>
    );
  }

  return (
    <Stack gap="lg">
      <div className="flex items-center justify-between">
        <Text size="sm" variant="muted">
          {timelines.length} timeline{timelines.length !== 1 ? 's' : ''}
        </Text>
        <AlertDialog open={recreateOpen} onOpenChange={setRecreateOpen}>
          <AlertDialogTrigger
            render={
              <Button
                size="sm"
                variant="outline"
                iconLeft={<Reset size={14} />}
                loading={recreating}
              >
                Recreate All
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recreate All Timelines</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all existing timelines for this organization and recreate them from the latest templates. All progress and customizations will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRecreate}>
                Recreate All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {timelines.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No timelines found for this organization.
        </div>
      ) : (
        timelines.map((timeline) => (
          <TimelineCard
            key={timeline.id}
            timeline={timeline}
            orgId={orgId}
            onMutate={mutate}
          />
        ))
      )}
    </Stack>
  );
}
