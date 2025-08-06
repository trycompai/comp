import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { getGT } from 'gt-next/server';
import type { Metadata } from 'next';
import PolicyPage from './components/PolicyPage';
import {
  getAssignees,
  getComments,
  getLogsForPolicy,
  getPolicy,
  getPolicyControlMappingInfo,
} from './data';

export default async function PolicyDetails({
  params,
}: {
  params: Promise<{ policyId: string; orgId: string }>;
}) {
  const { policyId, orgId } = await params;
  const t = await getGT();

  const policy = await getPolicy(policyId);
  const assignees = await getAssignees();
  const comments = await getComments(policyId);
  const { mappedControls, allControls } = await getPolicyControlMappingInfo(policyId);
  const logs = await getLogsForPolicy(policyId);

  const isPendingApproval = !!policy?.approverId;

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: t('Policies'), href: `/${orgId}/policies/all` },
        { label: policy?.name ?? t('Policy'), current: true },
      ]}
    >
      <PolicyPage
        policy={policy}
        policyId={policyId}
        assignees={assignees}
        mappedControls={mappedControls}
        allControls={allControls}
        isPendingApproval={isPendingApproval}
        logs={logs}
        comments={comments}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();

  return {
    title: t('Policy Overview'),
  };
}
