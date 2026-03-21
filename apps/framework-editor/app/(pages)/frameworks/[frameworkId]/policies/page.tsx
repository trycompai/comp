import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
import { redirect } from 'next/navigation';
import { PoliciesClientPage } from '../../../policies/PoliciesClientPage';

interface PolicyTemplateItem {
  id: string;
  name: string;
  description: string;
  frequency: string;
  department: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export default async function Page({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const isAllowed = await isAuthorized();
  if (!isAllowed) redirect('/auth');

  const { frameworkId } = await params;

  const policies =
    await serverApi<PolicyTemplateItem[]>(`/policy-template?frameworkId=${frameworkId}`);

  return <PoliciesClientPage initialPolicies={policies} frameworkId={frameworkId} />;
}
