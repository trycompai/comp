import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { auth } from '@/utils/auth';
import type { FrameworkEditorRequirement } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSingleFrameworkInstanceWithControls } from '../../../data/getSingleFrameworkInstanceWithControls';
import { RequirementControls } from './components/RequirementControls';

interface PageProps {
  params: Promise<{
    frameworkInstanceId: string;
    requirementKey: string;
  }>;
}

export default async function RequirementPage({ params }: PageProps) {
  const { frameworkInstanceId, requirementKey } = await params;

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

  const allReqDefsForFramework = await db.frameworkEditorRequirement.findMany({
    where: {
      frameworkId: frameworkInstanceWithControls.frameworkId,
    },
  });

  const requirementsFromDb = allReqDefsForFramework.reduce<
    Record<string, FrameworkEditorRequirement>
  >((acc, def) => {
    acc[def.id] = def;
    return acc;
  }, {});

  const currentRequirementDetails = requirementsFromDb[requirementKey];

  if (!currentRequirementDetails) {
    redirect(`/${organizationId}/frameworks/${frameworkInstanceId}`);
  }

  const frameworkName = frameworkInstanceWithControls.framework.name;

  const siblingRequirements = allReqDefsForFramework.filter((def) => def.id !== requirementKey);

  const siblingRequirementsDropdown = siblingRequirements.map((def) => ({
    label: def.name,
    href: `/${organizationId}/frameworks/${frameworkInstanceId}/requirements/${def.id}`,
  }));

  const tasks =
    (await db.task.findMany({
      where: {
        organizationId,
      },
      include: {
        controls: true,
      },
    })) || [];

  const relatedControls = await db.requirementMap.findMany({
    where: {
      frameworkInstanceId,
      requirementId: requirementKey,
    },
    include: {
      control: true,
    },
  });

  console.log('relatedControls', relatedControls);

  const maxLabelLength = 40;

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'Frameworks', href: `/${organizationId}/frameworks` },
        {
          label: frameworkName,
          href: `/${organizationId}/frameworks/${frameworkInstanceId}`,
        },
        {
          label:
            currentRequirementDetails.name.length > maxLabelLength
              ? `${currentRequirementDetails.name.slice(0, maxLabelLength)}...`
              : currentRequirementDetails.name,
          dropdown: siblingRequirementsDropdown,
          current: true,
        },
      ]}
    >
      <div className="flex flex-col gap-6">
        <RequirementControls
          requirement={currentRequirementDetails}
          tasks={tasks}
          relatedControls={relatedControls}
        />
      </div>
    </PageWithBreadcrumb>
  );
}
