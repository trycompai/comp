import { Breadcrumb, PageLayout, Text } from '@trycompai/design-system';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import { ISO27001_NAMES } from '../isms-types';
import { WizardClient } from './WizardClient';
import type { WizardProfileResponse } from './wizard-types';

interface FrameworkApiResponse {
  data: Array<{ id: string; frameworkId: string; framework: { id: string; name: string } }>;
}

export default async function IsmsWizardPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const breadcrumb = (
    <Breadcrumb
      items={[
        {
          label: 'Documents',
          href: `/${orgId}/documents?tab=iso-27001`,
          props: { render: <Link href={`/${orgId}/documents?tab=iso-27001`} /> },
        },
        { label: 'Setup wizard', isCurrent: true },
      ]}
    />
  );

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) notFound();

  const frameworksResult = await serverApi.get<FrameworkApiResponse>('/v1/frameworks');
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
            Add the ISO 27001 framework to your organization to run the ISMS setup wizard.
          </Text>
        </div>
      </PageLayout>
    );
  }

  const profileResult = await serverApi.get<WizardProfileResponse>(
    `/v1/isms/profile?frameworkId=${encodeURIComponent(isoFramework.frameworkId)}`,
  );
  const fallbackData = profileResult.data ?? null;

  return (
    <PageLayout>
      {breadcrumb}
      <WizardClient
        organizationId={orgId}
        frameworkId={isoFramework.frameworkId}
        fallbackData={fallbackData}
      />
    </PageLayout>
  );
}
