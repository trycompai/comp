'use client';

import { useFeatureFlag } from '@trycompai/analytics';
import { Stack, Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { useFrameworkInstance } from '@/hooks/use-framework-instance';
import { usePermissions } from '@/hooks/use-permissions';
import { FrameworkOverview } from './FrameworkOverview';
import { FrameworkRequirements } from './FrameworkRequirements';
import { FrameworkTimeline } from './FrameworkTimeline';
import { SyncHistorySection } from './SyncHistorySection';

interface FrameworkDetailContentProps {
  frameworkInstanceId: string;
  initialFramework: any;
}

export function FrameworkDetailContent({
  frameworkInstanceId,
  initialFramework,
}: FrameworkDetailContentProps) {
  const versioningEnabled = useFeatureFlag('is-framework-versioning-enabled');
  const { permissions } = usePermissions();

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

  const overview = (
    <Stack gap="lg">
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
    </Stack>
  );

  if (!versioningEnabled) {
    return overview;
  }

  return (
    <Tabs defaultValue="overview">
      <Stack gap="lg">
        <TabsList variant="underline">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">{overview}</TabsContent>
        <TabsContent value="history">
          <SyncHistorySection
            frameworkInstanceId={frameworkInstanceId}
            permissions={permissions}
          />
        </TabsContent>
      </Stack>
    </Tabs>
  );
}
