import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { ControlsClientPage } from '../../../controls/ControlsClientPage';
import type { FrameworkEditorControlTemplateWithRelatedData } from '../../../controls/types';

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const controls =
    await serverApi<FrameworkEditorControlTemplateWithRelatedData[]>(
      `/control-template?frameworkId=${frameworkId}`,
    );

  return <ControlsClientPage initialControls={controls} frameworkId={frameworkId} />;
}
