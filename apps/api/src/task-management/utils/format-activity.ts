/**
 * Format task item status for human-readable display
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    canceled: 'Canceled',
  };

  return statusMap[status] || status;
}

/**
 * Format task item priority for human-readable display
 */
export function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };

  return priorityMap[priority] || priority;
}
