'use client';

import { Avatar, AvatarFallback, AvatarImage, Button, HStack, Spinner, Stack, Text } from '@trycompai/design-system';
import { DotMark } from '@trycompai/design-system/icons';
import { formatDistanceToNow } from 'date-fns';
import type { TaskItem } from '@/hooks/use-task-items';
import { useTaskItemActivity } from './hooks/use-task-item-activity';
import { useEffect, useState, useMemo } from 'react';

interface TaskItemActivityTimelineProps {
  taskItem: TaskItem;
  onActivityLoaded?: (mutate: () => void) => void;
}

export function TaskItemActivityTimeline({ taskItem, onActivityLoaded }: TaskItemActivityTimelineProps) {
  const { activity, isLoading, mutate } = useTaskItemActivity(taskItem.id);
  const [showAll, setShowAll] = useState(false);

  // Expose mutate function to parent
  useEffect(() => {
    if (onActivityLoaded) {
      onActivityLoaded(mutate);
    }
  }, [onActivityLoaded, mutate]);

  // Show first 3 and last 5 items if more than 10
  const displayedActivity = useMemo(() => {
    if (showAll || activity.length <= 10) {
      return activity;
    }

    const firstItems = activity.slice(0, 3);
    const lastItems = activity.slice(-5);
    const hiddenCount = activity.length - 8;

    return { firstItems, lastItems, hiddenCount };
  }, [activity, showAll]);
  if (isLoading) {
    return (
      <Stack gap="md">
        <Text size="sm" weight="semibold">
          Activity
        </Text>
        <HStack justify="center">
          <Spinner />
        </HStack>
      </Stack>
    );
  }

  const renderActivityItem = (log: any) => (
    <HStack key={log.id} gap="sm" align="start">
      <Avatar size="sm">
        <AvatarImage
          src={log.user.image || undefined}
          alt={log.user.name || log.user.email}
        />
        <AvatarFallback>
          {(log.user.name || log.user.email)?.charAt(0).toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <Stack gap="xs">
        <Text size="sm">
          <Text as="span" weight="medium">
            {log.user.name || log.user.email}
          </Text>{' '}
          {log.description}
        </Text>
        <Text size="xs" variant="muted">
          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
        </Text>
      </Stack>
    </HStack>
  );

  return (
    <Stack gap="md">
      <Text size="sm" weight="semibold">
        Activity
      </Text>
      <div className="relative">
        {/* Timeline line */}
        {activity.length > 0 && (
        <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
        )}
        
        <Stack gap="md">
          {activity.length === 0 ? (
            <Text size="sm" variant="muted">
              No activity yet
            </Text>
          ) : Array.isArray(displayedActivity) ? (
            // Show all items
            displayedActivity.map(renderActivityItem)
          ) : (
            // Show collapsed view
            <>
              {displayedActivity.firstItems.map(renderActivityItem)}
              
              <HStack gap="sm" align="center">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <DotMark className="h-2 w-2 text-muted-foreground" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(true)}
                >
                  Show {displayedActivity.hiddenCount} more {displayedActivity.hiddenCount === 1 ? 'activity' : 'activities'}
                </Button>
              </HStack>

              {displayedActivity.lastItems.map(renderActivityItem)}
            </>
          )}
        </Stack>
      </div>
    </Stack>
  );
}

