import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import { serverApi } from '@/lib/api-server';
import { redirect } from 'next/navigation';
import { RequirementControls } from './components/RequirementControls';

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
    requirementKey: string;
  }>;
}

export default async function RequirementPage({ params }: PageProps) {
  const { orgId: organizationId, frameworkInstanceId, requirementKey } =
    await params;

  const [frameworkRes, requirementRes] = await Promise.all([
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
    serverApi.get<any>(
      `/v1/frameworks/${frameworkInstanceId}/requirements/${requirementKey}`,
    ),
  ]);

  if (!frameworkRes.data || !requirementRes.data) {
    redirect(`/${organizationId}/frameworks/${frameworkInstanceId}`);
  }

  const framework = frameworkRes.data;
  const reqData = requirementRes.data;
  const frameworkName = framework.framework?.name ?? 'Framework';
  const requirement = reqData.requirement;

  const siblingRequirementsDropdown = (reqData.siblingRequirements ?? []).map(
    (def: { id: string; name: string }) => ({
      label: def.name,
      href: `/${organizationId}/frameworks/${frameworkInstanceId}/requirements/${def.id}`,
    }),
  );

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
            requirement.name.length > maxLabelLength
              ? `${requirement.name.slice(0, maxLabelLength)}...`
              : requirement.name,
          dropdown: siblingRequirementsDropdown,
          current: true,
        },
      ]}
    >
      <div className="flex flex-col gap-6">
        <RequirementControls
          requirement={requirement}
          tasks={reqData.tasks ?? []}
          relatedControls={reqData.relatedControls ?? []}
        />
      </div>
    </PageWithBreadcrumb>
  );
}
