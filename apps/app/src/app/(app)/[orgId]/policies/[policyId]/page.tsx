import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import type { Metadata } from 'next';
import { PolicyHeaderActions } from './components/PolicyHeaderActions';
import PolicyPage from './components/PolicyPage';
import { getAssignees, getLogsForPolicy, getPolicy, getPolicyControlMappingInfo } from './data';

export default async function PolicyDetails({
  params,
}: {
  params: Promise<{ policyId: string; orgId: string }>;
}) {
  const { policyId, orgId } = await params;

  const policy = await getPolicy(policyId);
  const assignees = await getAssignees();
  const { mappedControls, allControls } = await getPolicyControlMappingInfo(policyId);
  const logs = await getLogsForPolicy(policyId);

  const isPendingApproval = !!policy?.approverId;

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Policies', href: `/${orgId}/policies/all` },
        { label: policy?.name ?? 'Policy', current: true },
      ]}
      headerRight={<PolicyHeaderActions policy={policy} logs={logs} />}
    >
      <PolicyPage
        policy={policy}
        policyId={policyId}
        assignees={assignees}
        mappedControls={mappedControls}
        allControls={allControls}
        isPendingApproval={isPendingApproval}
        logs={logs}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policy Overview',
  };
}
