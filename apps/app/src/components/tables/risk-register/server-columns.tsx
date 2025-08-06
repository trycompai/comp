import { getGT } from 'gt-next/server';

export async function getServerColumnHeaders() {
  const t = await getGT();

  return {
    title: t('Risk'),
    status: t('Status'),
    department: t('Department'),
    assigneeId: t('Assignee'),
  };
}
