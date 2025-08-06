import { getGT } from 'gt-next/server';

export async function getServerColumnHeaders() {
  const t = await getGT();
  return {
    name: t('Policy Name'),
    status: t('Status'),
    updatedAt: t('Last Updated'),
  };
}
