import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { ControlsClientPage } from '../../../controls/ControlsClientPage';

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const controls = await serverApi<Array<Record<string, unknown>>>(
    `/framework/${frameworkId}/controls`,
  );

  return (
    <ControlsClientPage
      initialControls={controls}
      emptyMessage="No controls linked to this framework yet. Add controls to requirements first."
    />
  );
}
