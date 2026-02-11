import { getFeatureFlags } from '@/app/posthog';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import type {
  AuditLog,
  Control,
  Member,
  Organization,
  Policy,
  PolicyVersion,
  User,
} from '@db';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { PolicyHeaderActions } from './components/PolicyHeaderActions';
import PolicyPage from './components/PolicyPage';
import { PolicyStatusBadge } from './components/PolicyStatusBadge';

type PolicyDetail = Policy & {
  approver: (Member & { user: User }) | null;
  assignee: (Member & { user: User }) | null;
  currentVersion:
    | (PolicyVersion & {
        publishedBy: (Member & { user: User }) | null;
      })
    | null;
};

type PolicyVersionWithPublisher = PolicyVersion & {
  publishedBy: (Member & { user: User }) | null;
};

type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};

export default async function PolicyDetails({
  params,
}: {
  params: Promise<{ policyId: string; orgId: string }>;
}) {
  const { policyId, orgId } = await params;

  const [policyRes, membersRes, controlsRes, activityRes, versionsRes] =
    await Promise.all([
      serverApi.get<PolicyDetail>(`/v1/policies/${policyId}`),
      serverApi.get<{ data: (Member & { user: User })[] }>('/v1/people'),
      serverApi.get<{ mappedControls: Control[]; allControls: Control[] }>(
        `/v1/policies/${policyId}/controls`,
      ),
      serverApi.get<{ data: AuditLogWithRelations[] }>(
        `/v1/policies/${policyId}/activity`,
      ),
      serverApi.get<{
        data: {
          versions: PolicyVersionWithPublisher[];
          currentVersionId: string | null;
          pendingVersionId: string | null;
        };
      }>(`/v1/policies/${policyId}/versions`),
    ]);

  const policy = policyRes.data ?? null;
  const allMembers = Array.isArray(membersRes.data?.data)
    ? membersRes.data.data
    : [];
  // Filter to assignable members (exclude employee, contractor, deactivated)
  const assignees = allMembers.filter(
    (m) =>
      !m.deactivated &&
      !m.role.includes('employee') &&
      !m.role.includes('contractor'),
  );
  const mappedControls = controlsRes.data?.mappedControls ?? [];
  const allControls = controlsRes.data?.allControls ?? [];
  const logs = Array.isArray(activityRes.data?.data)
    ? activityRes.data.data
    : [];
  const versions = versionsRes.data?.data?.versions ?? [];
  const isPendingApproval = !!policy?.approverId;

  // Check feature flag for AI policy editor
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const flags = session?.user?.id
    ? await getFeatureFlags(session.user.id)
    : {};
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {policy?.name ?? 'Policy'}
          </h1>
          {policy && <PolicyStatusBadge status={policy.status} />}
        </div>
        <PolicyHeaderActions policy={policy} organizationId={orgId} />
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
