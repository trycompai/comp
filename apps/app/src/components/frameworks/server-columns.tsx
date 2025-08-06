import { getGT } from 'gt-next/server';

export async function getServerColumnHeaders() {
  const t = await getGT();
  return {
    name: t('Control'),
    status: t('Status'),
    artifacts: t('Artifacts'),
  };
}
