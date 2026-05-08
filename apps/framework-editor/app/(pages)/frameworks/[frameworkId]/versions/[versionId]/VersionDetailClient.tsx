'use client';

import Link from 'next/link';
import { Button } from '@trycompai/ui';
import { useFrameworkVersionDiff } from '../hooks/useFrameworkVersionDiff';
import { VersionDiffView, hasAnyChanges } from '../components/VersionDiffView';

interface VersionDetailClientProps {
  frameworkId: string;
  versionId: string;
}

export function VersionDetailClient({ frameworkId, versionId }: VersionDetailClientProps) {
  const { data, isLoading, error } = useFrameworkVersionDiff(frameworkId, versionId);

  if (isLoading) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Loading version…</p>;
  }

  if (error) {
    return (
      <p className="text-destructive py-8 text-center text-sm">
        Failed to load version: {error.message}
      </p>
    );
  }

  if (!data) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Version not found.</p>
    );
  }

  const { version, previousVersion, diff, linkChanges } = data;
  const hasChanges = hasAnyChanges(diff);
  const comparisonLabel = previousVersion
    ? `Compared with v${previousVersion.version}`
    : 'Initial version — comparing against an empty framework';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/frameworks/${frameworkId}/versions`}>
          <Button variant="ghost" size="sm" className="rounded-sm">
            ← Back to versions
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">v{version.version}</h2>
        <p className="text-muted-foreground text-xs">
          Published{' '}
          {new Date(version.publishedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
          {' · '}
          {comparisonLabel}
        </p>
        {version.releaseNotes && (
          <p className="mt-2 whitespace-pre-wrap text-sm">{version.releaseNotes}</p>
        )}
      </div>

      <div className="rounded-md border">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Changes</p>
          {!hasChanges && (
            <p className="text-muted-foreground mt-1 text-xs">
              No changes detected between this version and its predecessor.
            </p>
          )}
        </div>
        {hasChanges && <VersionDiffView diff={diff} linkChanges={linkChanges} />}
      </div>
    </div>
  );
}
