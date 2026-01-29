'use client';

import { Badge, Button, HStack, Stack, Text, Spinner } from '@trycompai/design-system';
import { Add, Close } from '@trycompai/design-system/icons';

interface TaskItemsHeaderProps {
  title: string;
  description: string;
  statsLoading: boolean;
  stats?: {
    total: number;
    byStatus: {
      todo: number;
      in_progress: number;
      in_review: number;
      done: number;
      canceled: number;
    };
  } | null;
  isCreateOpen: boolean;
  onToggleCreate: () => void;
}

export function TaskItemsHeader({
  title,
  description,
  statsLoading,
  stats,
  isCreateOpen,
  onToggleCreate,
}: TaskItemsHeaderProps) {
  return (
    <HStack justify="between" align="start">
      <Stack gap="xs">
        <HStack gap="xs" align="center">
          <Text size="sm" weight="medium">
            {title}
          </Text>
          {statsLoading ? (
            <Spinner />
          ) : (
            stats && stats.total > 0 && <Badge variant="secondary">{stats.total}</Badge>
          )}
        </HStack>
        <Text size="sm" variant="muted">
          {description}
        </Text>
        {!statsLoading && stats && stats.total > 0 && (
          <HStack gap="sm" align="center" wrap="wrap">
            {stats.byStatus.todo > 0 && (
              <HStack gap="xs" align="center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                <Text size="xs" variant="muted">
                  {stats.byStatus.todo} Todo
                </Text>
              </HStack>
            )}
            {stats.byStatus.in_progress > 0 && (
              <HStack gap="xs" align="center">
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                <Text size="xs" variant="muted">
                  {stats.byStatus.in_progress} In Progress
                </Text>
              </HStack>
            )}
            {stats.byStatus.in_review > 0 && (
              <HStack gap="xs" align="center">
                <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" />
                <Text size="xs" variant="muted">
                  {stats.byStatus.in_review} In Review
                </Text>
              </HStack>
            )}
            {stats.byStatus.done > 0 && (
              <HStack gap="xs" align="center">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <Text size="xs" variant="muted">
                  {stats.byStatus.done} Done
                </Text>
              </HStack>
            )}
            {stats.byStatus.canceled > 0 && (
              <HStack gap="xs" align="center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                <Text size="xs" variant="muted">
                  {stats.byStatus.canceled} Canceled
                </Text>
              </HStack>
            )}
          </HStack>
        )}
      </Stack>
      <Button
        size="icon"
        onClick={onToggleCreate}
        variant={isCreateOpen ? 'outline' : 'default'}
        aria-label={isCreateOpen ? 'Close create task' : 'Create task'}
      >
        {isCreateOpen ? <Close className="h-4 w-4" /> : <Add className="h-4 w-4" />}
      </Button>
    </HStack>
  );
}

