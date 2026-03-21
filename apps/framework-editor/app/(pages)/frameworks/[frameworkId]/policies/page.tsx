import { serverApi } from '@/app/lib/api-server';
import { isAuthorized } from '@/app/lib/utils';
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

  const policies = await serverApi<Array<Record<string, unknown>>>(
    `/framework/${frameworkId}/policies`,
  );

  return (
    <PoliciesClientPage
      initialPolicies={policies}
      emptyMessage="No policies linked to this framework yet. Link policy templates to controls first."
    />
  );
}
