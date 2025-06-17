import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
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

  const policy = await getPolicy(policyId);
  const assignees = await getAssignees();
  const comments = await getComments(policyId);
  const { mappedControls, allControls } = await getPolicyControlMappingInfo(policyId);
  const logs = await getLogsForPolicy(policyId);

  const isPendingApproval = !!policy?.approverId;

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Policies', href: `/${orgId}/policies/all` },
        { label: policy?.name ?? 'Policy', current: true },
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
  return {
    title: 'Policy Overview',
  };
}
