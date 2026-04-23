'use client';

import { useFrameworkInstance } from '@/hooks/use-framework-instance';
import { FrameworkOverview } from './FrameworkOverview';
import { FrameworkRequirements } from './FrameworkRequirements';
import { FrameworkTimeline } from './FrameworkTimeline';

interface FrameworkDetailContentProps {
  frameworkInstanceId: string;
  initialFramework: any;
}

export function FrameworkDetailContent({
  frameworkInstanceId,
  initialFramework,
}: FrameworkDetailContentProps) {
  // SWR keeps the framework data live so that after a sync/rollback triggers
  // `mutate('/v1/frameworks/:id')`, requirements/controls/tasks here update
  // without a full page refresh.
  const { data } = useFrameworkInstance<any>(frameworkInstanceId, {
    fallbackData: initialFramework,
  });

  const framework = data ?? initialFramework;
  const frameworkInstanceWithControls = {
    ...framework,
    controls: framework.controls ?? [],
  };

  return (
    <>
      <FrameworkOverview
        frameworkInstanceWithControls={frameworkInstanceWithControls}
        tasks={framework.tasks || []}
        evidenceSubmissions={framework.evidenceSubmissions || []}
      />
      <FrameworkTimeline frameworkInstanceId={frameworkInstanceId} />
      <FrameworkRequirements
        requirementDefinitions={framework.requirementDefinitions || []}
        frameworkInstanceWithControls={frameworkInstanceWithControls}
        tasks={framework.tasks || []}
        evidenceSubmissions={framework.evidenceSubmissions || []}
      />
    </>
  );
}
