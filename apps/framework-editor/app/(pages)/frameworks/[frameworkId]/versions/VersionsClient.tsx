'use client';

import { Button } from '@trycompai/ui';
import { useState } from 'react';
import { useFrameworkVersions } from './hooks/useFrameworkVersions';
import { PublishVersionDialog } from './components/PublishVersionDialog';
import { VersionList } from './components/VersionList';

interface VersionsClientProps {
  frameworkId: string;
}

export function VersionsClient({ frameworkId }: VersionsClientProps) {
  const [publishOpen, setPublishOpen] = useState(false);
  const { data: versions, isLoading, error, refetch } = useFrameworkVersions(frameworkId);

  const latestVersion = versions?.[0]?.version;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Published Versions</h2>
        <Button onClick={() => setPublishOpen(true)} className="rounded-sm">
          Publish new version
        </Button>
      </div>

      <VersionList
        frameworkId={frameworkId}
        versions={versions}
        isLoading={isLoading}
        error={error}
      />

      <PublishVersionDialog
        frameworkId={frameworkId}
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        latestVersion={latestVersion}
        onPublished={refetch}
      />
    </div>
  );
}
