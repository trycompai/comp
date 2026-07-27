import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { IsmsDocumentsClientPage } from '../../../isms-documents/IsmsDocumentsClientPage';
import type { IsmsDocumentTemplate } from '../../../isms-documents/types';

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const templates = await serverApi<IsmsDocumentTemplate[]>(
    `/isms-document-template?frameworkId=${frameworkId}`,
  );

  return <IsmsDocumentsClientPage templates={templates} frameworkId={frameworkId} />;
}
