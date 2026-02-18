import { getFeatureFlags } from '@/app/posthog';
import { auth } from '@/utils/auth';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { PolicyHeaderActions } from './components/PolicyHeaderActions';
import PolicyPage from './components/PolicyPage';
import { PolicyStatusBadge } from './components/PolicyStatusBadge';
import {
  getAssignees,
  getLogsForPolicy,
  getPolicy,
  getPolicyControlMappingInfo,
  getPolicyVersions,
} from './data';

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
  const versions = await getPolicyVersions(policyId);

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
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Policies',
            href: `/${orgId}/policies`,
            props: { render: <Link href={`/${orgId}/policies`} /> },
          },
          { label: policy?.name ?? 'Policy', isCurrent: true },
        ]}
      />
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{policy?.name ?? 'Policy'}</h1>
          {policy && <PolicyStatusBadge status={policy.status} />}
        </div>
        <PolicyHeaderActions policy={policy} logs={logs} />
      </div>
      <PolicyPage
        policy={policy}
        policyId={policyId}
        organizationId={orgId}
        assignees={assignees}
        mappedControls={mappedControls}
        allControls={allControls}
        isPendingApproval={isPendingApproval}
        logs={logs}
        versions={versions}
        showAiAssistant={isAiPolicyEditorEnabled}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Policy Overview',
  };
}
