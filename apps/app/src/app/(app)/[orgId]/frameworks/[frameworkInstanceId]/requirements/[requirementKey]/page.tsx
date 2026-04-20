import { serverApi } from '@/lib/api-server';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageLayout,
} from '@trycompai/design-system';
import { redirect } from 'next/navigation';
import { RequirementControls } from './components/RequirementControls';
import { AddCustomControlSheet } from './components/AddCustomControlSheet';
import { LinkExistingControlSheet } from './components/LinkExistingControlSheet';

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
  const frameworkName =
    framework.framework?.name ?? framework.customFramework?.name ?? 'Framework';
  const isCustomFramework = Boolean(framework.customFrameworkId);
  const requirement = reqData.requirement;

  const identifier: string | undefined = requirement.identifier?.trim() || undefined;
  const title = identifier ?? requirement.name;
  const showNameAsDescription = Boolean(identifier) && requirement.name;

  return (
    <PageLayout>
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: 'Frameworks', href: `/${organizationId}/frameworks` },
          {
            label: frameworkName,
            href: `/${organizationId}/frameworks/${frameworkInstanceId}`,
          },
          { label: identifier ?? 'Requirement', isCurrent: true },
        ]}
      >
        {showNameAsDescription ? (
          <PageHeaderDescription>{requirement.name}</PageHeaderDescription>
        ) : null}
        <PageHeaderActions>
          <LinkExistingControlSheet
            frameworkInstanceId={frameworkInstanceId}
            requirementId={requirementKey}
            isCustomRequirement={isCustomFramework}
            alreadyMappedControlIds={(reqData.relatedControls ?? []).map(
              (rc: { control: { id: string } }) => rc.control.id,
            )}
          />
          <AddCustomControlSheet
            frameworkInstanceId={frameworkInstanceId}
            requirementId={requirementKey}
            isCustomRequirement={isCustomFramework}
          />
        </PageHeaderActions>
      </PageHeader>
      <RequirementControls
        tasks={reqData.tasks ?? []}
        relatedControls={reqData.relatedControls ?? []}
        evidenceSubmissions={reqData.evidenceSubmissions ?? []}
        frameworkInstanceId={frameworkInstanceId}
      />
    </PageLayout>
  );
}
