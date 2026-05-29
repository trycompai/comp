import { Breadcrumb, PageLayout, Text } from '@trycompai/design-system';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { parseRolesString } from '@/lib/permissions';
import { auth } from '@/utils/auth';
import { ContextOfOrganizationClient } from '../components/ContextOfOrganizationClient';
import type { ApproverOption } from '../components/IsmsApprovalSection';
import {
  ISMS_SLUG_TO_TYPE,
  ISMS_TYPE_META,
  ISO27001_NAMES,
  type IsmsDocument as IsmsDocumentData,
  type IsmsEnsureSetupResponse,
} from '../isms-types';

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

  if (!meta.detailRouteEnabled) {
    return (
      <PageLayout>
        {breadcrumb}
        <div className="flex items-center justify-center rounded-lg border py-12">
          <Text variant="muted">{meta.title} is coming soon.</Text>
        </div>
      </PageLayout>
    );
  }

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
    organizationId,
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

  const people = peopleResult.data?.data ?? [];
  const currentMember = people.find((p) => p.userId === session.user.id && !p.deactivated) ?? null;
  const approverOptions: ApproverOption[] = people
    .filter(
      (p) =>
        !p.deactivated &&
        parseRolesString(p.role).some((role) => role === 'owner' || role === 'admin'),
    )
    .map((p) => ({ id: p.id, name: p.user?.name ?? p.user?.email ?? 'Unknown' }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PageLayout>
      {breadcrumb}
      <ContextOfOrganizationClient
        organizationId={organizationId}
        documentId={setupDoc.id}
        fallbackData={fallbackData}
        currentMemberId={currentMember?.id ?? null}
        approverOptions={approverOptions}
      />
    </PageLayout>
  );
}
