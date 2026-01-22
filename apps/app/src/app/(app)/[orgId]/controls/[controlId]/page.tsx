import { auth } from '@/utils/auth';
import { Breadcrumb, PageHeader, PageLayout } from '@trycompai/design-system';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ControlHeaderActions } from './components/ControlHeaderActions';
import { SingleControl } from './components/SingleControl';
import { getControl } from './data/getControl';
import type { ControlProgressResponse } from './data/getOrganizationControlProgress';
import { getOrganizationControlProgress } from './data/getOrganizationControlProgress';
import { getRelatedPolicies } from './data/getRelatedPolicies';

interface ControlPageProps {
  params: {
    controlId: string;
    orgId: string;
    locale: string;
  };
}

export default async function ControlPage({ params }: ControlPageProps) {
  // Await params before using them
  const { controlId, orgId, locale } = await Promise.resolve(params);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.session.activeOrganizationId) {
    redirect('/');
  }

  const control = await getControl(controlId);

  // If we get an error or no result, redirect
  if (!control || 'error' in control) {
    redirect('/');
  }

  const organizationControlProgressResult = await getOrganizationControlProgress(controlId);

  // Extract the progress data from the result or create default data if there's an error
  const controlProgress: ControlProgressResponse = ('data' in
    (organizationControlProgressResult || {}) &&
    organizationControlProgressResult?.data?.progress) || {
    total: 0,
    completed: 0,
    progress: 0,
    byType: {},
  };

  const relatedPolicies = await getRelatedPolicies({
    organizationId: orgId,
    controlId: controlId,
  });

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          {
            label: 'Controls',
            href: `/${orgId}/controls`,
            props: { render: <Link href={`/${orgId}/controls`} /> },
          },
          { label: control.name, isCurrent: true },
        ]}
      />
      <PageHeader title={control.name} actions={<ControlHeaderActions control={control} />} />
      <SingleControl
        control={control}
        controlProgress={controlProgress}
        relatedPolicies={relatedPolicies}
        relatedTasks={control.tasks}
      />
    </PageLayout>
  );
}
