import { Breadcrumb, PageLayout, Text } from '@trycompai/design-system';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { hasPermission } from '@/lib/permissions';
import { resolveUserPermissions } from '@/lib/permissions.server';
import { auth } from '@/utils/auth';
import { ContextOfOrganizationClient } from '../components/ContextOfOrganizationClient';
import { InterestedPartiesClient } from '../components/InterestedPartiesClient';
import type { ApproverOption } from '../components/IsmsApprovalSection';
import { LeadershipClient } from '../components/LeadershipClient';
import { MonitoringClient } from '../components/MonitoringClient';
import { ObjectivesClient } from '../components/ObjectivesClient';
import { RequirementsClient } from '../components/RequirementsClient';
import { RolesClient } from '../components/RolesClient';
import { ScopeClient } from '../components/ScopeClient';
import {
  ISMS_SLUG_TO_TYPE,
  ISMS_TYPE_META,
  ISO27001_NAMES,
  type IsmsDocument as IsmsDocumentData,
  type IsmsDocumentType,
  type IsmsEnsureSetupResponse,
} from '../isms-types';

/** Shared props every ISMS detail client receives. */
interface IsmsDetailClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  /** All active members (for the Roles member pickers); superset of approvers. */
  memberOptions: ApproverOption[];
}

const ISMS_DETAIL_CLIENTS: Record<
  IsmsDocumentType,
  (props: IsmsDetailClientProps) => React.JSX.Element
> = {
  context_of_organization: ContextOfOrganizationClient,
  interested_parties_register: InterestedPartiesClient,
  interested_parties_requirements: RequirementsClient,
  objectives_plan: ObjectivesClient,
  roles_and_responsibilities: RolesClient,
  monitoring: MonitoringClient,
  isms_scope: ScopeClient,
  leadership_commitment: LeadershipClient,
};

interface FrameworkApiResponse {
  data: Array<{ id: string; frameworkId: string; framework: { id: string; name: string } }>;
}

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    userId: string;
    deactivated: boolean;
    user: { id: string; name: string | null; email: string };
  }>;
}

export default async function IsmsDocumentPage({
  params,
}: {
  params: Promise<{ orgId: string; type: string }>;
}) {
  const { orgId, type: typeSlug } = await params;
  const documentType = ISMS_SLUG_TO_TYPE[typeSlug];
  if (!documentType) notFound();

  const meta = ISMS_TYPE_META.find((entry) => entry.type === documentType);
  if (!meta) notFound();

  const breadcrumb = (
    <Breadcrumb
      items={[
        {
          label: 'Documents',
          href: `/${orgId}/documents`,
          props: { render: <Link href={`/${orgId}/documents?tab=iso-27001`} /> },
        },
        { label: meta.title, isCurrent: true },
      ]}
    />
  );

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) notFound();
  const organizationId = session.session.activeOrganizationId ?? orgId;

  const [frameworksResult, peopleResult] = await Promise.all([
    serverApi.get<FrameworkApiResponse>('/v1/frameworks'),
    serverApi.get<PeopleApiResponse>('/v1/people'),
  ]);

  const frameworks = frameworksResult.data?.data ?? [];
  const isoFramework = frameworks.find(
    (instance) => instance.framework?.name && ISO27001_NAMES.includes(instance.framework.name),
  );

  if (!isoFramework) {
    return (
      <PageLayout>
        {breadcrumb}
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Text variant="muted">
            Add the ISO 27001 framework to your organization to manage this document.
          </Text>
        </div>
      </PageLayout>
    );
  }

  const setupResult = await serverApi.post<IsmsEnsureSetupResponse>('/v1/isms/ensure-setup', {
    frameworkId: isoFramework.frameworkId,
  });

  const setupDoc = setupResult.data?.documents?.find((doc) => doc.type === documentType);
  if (!setupDoc) {
    return (
      <PageLayout>
        {breadcrumb}
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Text variant="muted">Unable to load this document. Please try again later.</Text>
        </div>
      </PageLayout>
    );
  }

  const documentResult = await serverApi.get<IsmsDocumentData>(
    `/v1/isms/documents/${setupDoc.id}`,
  );
  const fallbackData = documentResult.data ?? null;

  // If /v1/people is unavailable to this user (e.g. no member:read), approval
  // simply degrades to "unavailable" — no approvers, no current member — rather
  // than breaking the page.
  const people = peopleResult.data?.data ?? [];
  const currentMember = people.find((p) => p.userId === session.user.id && !p.deactivated) ?? null;

  // An approver is any active member whose effective permissions include
  // evidence:update (the same gate that lets a user manage ISMS documents),
  // resolved via RBAC rather than hardcoded role strings.
  const activeMembers = people.filter((p) => !p.deactivated);
  const approverFlags = await Promise.all(
    activeMembers.map(async (p) => {
      const permissions = await resolveUserPermissions(p.role, organizationId);
      return hasPermission(permissions, 'evidence', 'update');
    }),
  );
  const approverOptions: ApproverOption[] = activeMembers
    .filter((_, index) => approverFlags[index])
    .map((p) => ({ id: p.id, name: p.user?.name ?? p.user?.email ?? 'Unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // All active members — the Roles document assigns to the whole workforce, not
  // just approvers, so it needs the full list plus the headcount for the band.
  const memberOptions: ApproverOption[] = activeMembers
    .map((p) => ({ id: p.id, name: p.user?.name ?? p.user?.email ?? 'Unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const DetailClient = ISMS_DETAIL_CLIENTS[documentType];

  return (
    <PageLayout>
      {breadcrumb}
      <DetailClient
        organizationId={organizationId}
        documentId={setupDoc.id}
        fallbackData={fallbackData}
        currentMemberId={currentMember?.id ?? null}
        approverOptions={approverOptions}
        memberOptions={memberOptions}
      />
    </PageLayout>
  );
}
