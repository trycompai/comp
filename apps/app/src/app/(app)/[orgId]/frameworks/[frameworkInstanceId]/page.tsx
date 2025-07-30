import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import PageWithBreadcrumb from '../../../../../components/pages/PageWithBreadcrumb';
import { getSingleFrameworkInstanceWithControls } from '../data/getSingleFrameworkInstanceWithControls';
import { FrameworkOverview } from './components/FrameworkOverview';
import { FrameworkRequirements } from './components/FrameworkRequirements';

interface PageProps {
  params: Promise<{
    frameworkInstanceId: string;
  }>;
}

export default async function FrameworkPage({ params }: PageProps) {
  const { frameworkInstanceId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/');
  }

  const organizationId = session.session.activeOrganizationId;

  if (!organizationId) {
    redirect('/');
  }

  const frameworkInstanceWithControls = await getSingleFrameworkInstanceWithControls({
    organizationId,
    frameworkInstanceId,
  });

  if (!frameworkInstanceWithControls) {
    redirect('/');
  }

  // Fetch requirement definitions for this framework
  const requirementDefinitions = await db.frameworkEditorRequirement.findMany({
    where: {
      frameworkId: frameworkInstanceWithControls.frameworkId,
    },
    orderBy: {
      name: 'asc',
    },
  });

  const frameworkName = frameworkInstanceWithControls.framework.name;

  const tasks = await db.task.findMany({
    where: {
      organizationId,
      controls: {
        some: {
          id: frameworkInstanceWithControls.id,
        },
      },
    },
    include: {
      controls: true,
    },
  });

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Frameworks', href: `/${organizationId}/frameworks` },
        { label: frameworkName, current: true },
      ]}
    >
      <div className="flex flex-col gap-6">
        <FrameworkOverview
          frameworkInstanceWithControls={frameworkInstanceWithControls}
          tasks={tasks || []}
        />
        <FrameworkRequirements
          requirementDefinitions={requirementDefinitions}
          frameworkInstanceWithControls={frameworkInstanceWithControls}
        />
      </div>
    </PageWithBreadcrumb>
  );
}
