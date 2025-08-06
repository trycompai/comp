import { getGT } from 'gt-next/server';

export async function getServerColumnHeaders() {
  const t = await getGT();
  return {
    title: t('Tasks'),
    status: t('Status'),
    assigneeId: t('Assignee'),
  };
}
