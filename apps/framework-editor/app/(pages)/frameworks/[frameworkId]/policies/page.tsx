import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import type { FrameworkEditorPolicyTemplate } from '@/db';
import { redirect } from 'next/navigation';
import { PoliciesClientPage } from '../../../policies/PoliciesClientPage';

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const policies =
    await serverApi<FrameworkEditorPolicyTemplate[]>(`/policy-template?frameworkId=${frameworkId}`);

  return <PoliciesClientPage initialPolicies={policies} frameworkId={frameworkId} />;
}
