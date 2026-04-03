import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { DocumentsClientPage } from '../../../documents/DocumentsClientPage';

interface ControlDocument {
  id: string;
  name: string;
  documentTypes: string[];
}

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const controls = await serverApi<ControlDocument[]>(
    `/framework/${frameworkId}/documents`,
  );

  return <DocumentsClientPage controls={controls} />;
}
