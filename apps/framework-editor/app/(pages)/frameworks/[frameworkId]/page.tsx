import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { FrameworkRequirementsClientPage } from './FrameworkRequirementsClientPage';

interface FrameworkDetail {
  id: string;
  name: string;
  version: string;
  description: string;
  visible: boolean;
  requirements: Array<{
    id: string;
    name: string;
    identifier: string;
    description: string;
    frameworkId: string;
    createdAt: string;
    updatedAt: string;
    controlTemplates: Array<{ id: string; name: string }>;
  }>;
}

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  let framework: FrameworkDetail;
  try {
    framework = await serverApi<FrameworkDetail>(`/framework/${frameworkId}`);
  } catch {
    redirect('/frameworks');
  }

  const { id, name, version, description, visible, requirements } = framework;

  return (
    <FrameworkRequirementsClientPage
      frameworkDetails={{ id, name, version, description, visible }}
      initialRequirements={requirements}
    />
  );
}
