import { getFeatureFlags } from '@/app/posthog';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
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

  // Check feature flag for AI policy editor
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const flags = session?.user?.id ? await getFeatureFlags(session.user.id) : {};
  const isAiPolicyEditorEnabled =
    flags['is-ai-policy-assistant-enabled'] === true ||
    flags['is-ai-policy-assistant-enabled'] === 'true';

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
        organizationId={orgId}
        assignees={assignees}
        mappedControls={mappedControls}
        allControls={allControls}
        isPendingApproval={isPendingApproval}
        logs={logs}
        showAiAssistant={isAiPolicyEditorEnabled}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policy Overview',
  };
}
