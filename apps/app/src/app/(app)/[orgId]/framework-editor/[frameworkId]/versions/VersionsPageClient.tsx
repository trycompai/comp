'use client';

import { useState } from 'react';
import { useFeatureFlag } from '@trycompai/analytics';
import { useFrameworkVersions } from '@/hooks/use-framework-versions';
import { PageHeader, PageLayout, Button, Text } from '@trycompai/design-system';
import { VersionList } from './components/VersionList';
import { PublishVersionDialog } from './components/PublishVersionDialog';

interface VersionsPageClientProps {
  frameworkId: string;
}

export function VersionsPageClient({ frameworkId }: VersionsPageClientProps) {
  const enabled = useFeatureFlag('is-framework-versioning-enabled');
  const [publishOpen, setPublishOpen] = useState(false);
  const { data: versions } = useFrameworkVersions(frameworkId);

  if (!enabled) {
    return (
      <PageLayout
        header={<PageHeader title="Framework Versions" />}
      >
        <Text size="sm" variant="muted">
          Framework versioning is not enabled for your account.
        </Text>
      </PageLayout>
    );
  }

  const latestVersion = versions?.[0]?.version;

  return (
    <PageLayout
      header={
        <PageHeader
          title="Framework Versions"
          actions={
            <Button onClick={() => setPublishOpen(true)}>
              Publish new version
            </Button>
          }
        />
      }
    >
      <VersionList frameworkId={frameworkId} />

      <PublishVersionDialog
        frameworkId={frameworkId}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        latestVersion={latestVersion}
      />
    </PageLayout>
  );
}
