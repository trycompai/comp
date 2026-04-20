import { serverApi } from '@/lib/api-server';
import type {
  Control,
  FrameworkEditorFramework,
  FrameworkEditorRequirement,
  FrameworkInstance,
  Policy,
  RequirementMap,
  Task,
} from '@db';
import { redirect } from 'next/navigation';
import { FrameworkControlShell } from './components/FrameworkControlShell';

type ControlDetail = Control & {
  policies: Policy[];
  tasks: Task[];
  controlDocumentTypes?: { formType: string }[];
  submissionCountsByFormType?: Record<string, number>;
  requirementsMapped: (RequirementMap & {
    frameworkInstance: FrameworkInstance & {
      framework: FrameworkEditorFramework;
    };
    requirement: FrameworkEditorRequirement;
  })[];
};

interface PageProps {
  params: Promise<{
    orgId: string;
    frameworkInstanceId: string;
    controlId: string;
  }>;
}

export default async function FrameworkControlPage({ params }: PageProps) {
  const { orgId, frameworkInstanceId, controlId } = await params;

  const [controlRes, frameworkRes] = await Promise.all([
    serverApi.get<ControlDetail>(`/v1/controls/${controlId}`),
    serverApi.get<any>(`/v1/frameworks/${frameworkInstanceId}`),
  ]);

  if (!controlRes.data || controlRes.error) {
    redirect(`/${orgId}/frameworks/${frameworkInstanceId}`);
  }

  const control = controlRes.data;
  const frameworkName = frameworkRes.data?.framework?.name ?? 'Framework';

  const matchedRequirement = control.requirementsMapped?.find(
    (rm) => rm.frameworkInstanceId === frameworkInstanceId,
  );
  const requirementLabel =
    matchedRequirement?.requirement?.identifier?.trim() ||
    matchedRequirement?.requirement?.name;
  const requirementId = matchedRequirement?.requirement?.id;
  const requirementHref = requirementId
    ? `/${orgId}/frameworks/${frameworkInstanceId}/requirements/${requirementId}`
    : undefined;

  const breadcrumbs = [
    { label: 'Frameworks', href: `/${orgId}/frameworks` },
    {
      label: frameworkName,
      href: `/${orgId}/frameworks/${frameworkInstanceId}`,
    },
    ...(requirementLabel && requirementHref
      ? [{ label: requirementLabel, href: requirementHref }]
      : []),
    { label: control.name, isCurrent: true },
  ];

  const documentRows = (control.controlDocumentTypes ?? []).map((d) => ({
    formType: d.formType,
    submissionCount:
      control.submissionCountsByFormType?.[d.formType] ?? 0,
  }));

  return (
    <FrameworkControlShell
      orgId={orgId}
      control={control}
      breadcrumbs={breadcrumbs}
      documentRows={documentRows}
    />
  );
}
