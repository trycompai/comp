import { TaskItemItem } from './TaskItemItem';
import type { TaskItem } from '@/hooks/use-task-items';

interface TaskItemListProps {
  taskItems: TaskItem[];
  entityId: string;
  entityType: string;
  page?: number;
  limit?: number;
  onStatusOrPriorityChange?: () => void;
}

export function TaskItemList({
  taskItems,
  entityId,
  entityType,
  page = 1,
  limit = 5,
  onStatusOrPriorityChange,
}: TaskItemListProps) {
  return (
    <div className="space-y-2">
      {taskItems.map((taskItem) => (
        <TaskItemItem
          key={taskItem.id}
          taskItem={taskItem}
          entityId={entityId}
          entityType={entityType}
          page={page}
          limit={limit}
          onStatusOrPriorityChange={onStatusOrPriorityChange}
        />
      ))}
    </div>
  );
}

