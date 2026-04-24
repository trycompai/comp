import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { Breadcrumb, PageLayout } from '@trycompai/design-system';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatementOfApplicabilitySection, type SOAData } from './components';

const ISO27001_NAMES = ['ISO 27001', 'iso27001', 'ISO27001'];

interface FrameworkApiResponse {
  data: Array<{
    id: string;
    frameworkId: string;
    framework: {
      id: string;
      name: string;
      description: string | null;
      visible: boolean;
    };
  }>;
}

interface PeopleApiResponse {
  data: Array<{
    id: string;
    role: string;
    userId: string;
    deactivated: boolean;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }>;
}

interface ContextApiResponse {
  data: Array<{
    id: string;
    question: string;
    answer: string | null;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }>;
}

export default async function StatementOfApplicabilityPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id || !session?.session?.activeOrganizationId) {
    return notFound();
  }

  const organizationId = session.session.activeOrganizationId;

  const [frameworksResult, peopleResult, contextResult] = await Promise.all([
    serverApi.get<FrameworkApiResponse>('/v1/frameworks'),
    serverApi.get<PeopleApiResponse>('/v1/people'),
    serverApi.get<ContextApiResponse>('/v1/context'),
  ]);

  const frameworks = frameworksResult.data?.data ?? [];
  const isoFrameworkInstance = frameworks.find(
    (fi) => fi.framework?.name && ISO27001_NAMES.includes(fi.framework.name),
  );

  const people = peopleResult.data?.data ?? [];
  const contextEntries = contextResult.data?.data ?? [];

  let soaData: SOAData | null = null;
  let soaError: string | null = null;

  if (isoFrameworkInstance) {
    try {
      const { frameworkId, framework } = isoFrameworkInstance;

      const setupResult = await serverApi.post<{
        success: boolean;
        error?: string;
        configuration: Record<string, unknown> | null;
        document: Record<string, unknown> | null;
      }>('/v1/soa/ensure-setup', { frameworkId, organizationId });

      const configuration = setupResult.data?.configuration;
      const document = setupResult.data?.document;

      if (configuration && document) {
        let approver = null;
        const approverId = document.approverId as string | undefined;
        if (approverId) {
          approver = people.find((p) => p.id === approverId) ?? null;
        }

        const currentMember =
          people.find((p) => p.userId === session.user.id && !p.deactivated) ?? null;

        const canApprove = currentMember
          ? currentMember.role.includes('owner') || currentMember.role.includes('admin')
          : false;

        const isPendingApproval = document.status === 'needs_review';
        const canCurrentUserApprove = isPendingApproval && approverId === currentMember?.id;

        const ownerAdminMembers = people
          .filter(
            (p) =>
              !p.deactivated && (p.role.includes('owner') || p.role.includes('admin')),
          )
          .sort((a, b) => (a.user?.name ?? '').localeCompare(b.user?.name ?? ''));

        let isFullyRemote = false;
        const teamWorkContext = contextEntries.find((c) =>
          c.question?.toLowerCase().includes('how does your team work'),
        );
        if (teamWorkContext?.answer) {
          const answerLower = teamWorkContext.answer.toLowerCase();
          isFullyRemote =
            answerLower.includes('fully remote') || answerLower.includes('fully-remote');
        }

        soaData = {
          framework,
          configuration,
          document,
          isFullyRemote,
          canApprove,
          approver: approver ? { ...approver, user: approver.user } : null,
          isPendingApproval,
          canCurrentUserApprove,
          currentMemberId: currentMember?.id || null,
          ownerAdminMembers,
        } as SOAData;
      }
    } catch (error) {
      console.error('Failed to setup SOA:', error);
      soaError = 'Failed to setup SOA. Please try again later.';
    }
  } else {
    soaError =
      'ISO 27001 framework not found. Please add ISO 27001 framework to your organization to get started.';
  }

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Documents',
            href: `/${orgId}/documents`,
            props: { render: <Link href={`/${orgId}/documents`} /> },
          },
          { label: 'Statement of Applicability', isCurrent: true },
        ]}
      />
      <StatementOfApplicabilitySection
        organizationId={organizationId}
        soaData={soaData}
        soaError={soaError}
      />
    </PageLayout>
  );
}
