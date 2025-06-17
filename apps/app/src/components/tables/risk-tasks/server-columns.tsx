export async function getServerColumnHeaders() {
  return {
    title: 'Tasks',
    status: 'Status',
    assigneeId: 'Assignee',
  };
}
