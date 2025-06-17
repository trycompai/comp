export async function getServerColumnHeaders() {
  return {
    name: 'Policy Name',
    status: 'Status',
    updatedAt: 'Last Updated',
  };
}
