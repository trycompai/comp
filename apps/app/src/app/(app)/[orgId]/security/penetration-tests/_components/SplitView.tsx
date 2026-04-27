'use client';

import { api } from '@/lib/api-client';
import type {
  PentestCreateRequest,
  PentestIssue,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useCreatePenetrationTest,
  usePenetrationTest,
  usePenetrationTestEvents,
  usePenetrationTestIssues,
  usePenetrationTests,
} from '../hooks/use-penetration-tests';
import { CreateRunPanel } from './CreateRunPanel';
import { DetailPane } from './DetailPane';
import { EmptyState } from './EmptyState';
import { OverviewPane } from './OverviewPane';
import { RunList } from './RunList';
import './pentest-tokens.css';

interface SplitViewProps {
  orgId: string;
  selectedRunId: string | null;
  mode?: 'default' | 'create';
}

/**
 * Top-level page shell for the pentests feature. Three modes based on URL:
 *   - `/pentests`             → Overview (selectedRunId null, mode default)
 *   - `/pentests/:id`         → Detail (selectedRunId set)
 *   - `/pentests/new`         → Create panel (mode create, list dimmed)
 */
export function SplitView({
  orgId,
  selectedRunId,
  mode = 'default',
}: SplitViewProps) {
  const router = useRouter();
  const [selectedFinding, setSelectedFinding] = useState<PentestIssue | null>(
    null,
  );

  const { reports, isLoading: listLoading } = usePenetrationTests(orgId);
  const {
    report: selectedRun,
    isLoading: runLoading,
    error: runError,
  } = usePenetrationTest(orgId, selectedRunId ?? '');
  const { issues } = usePenetrationTestIssues(
    orgId,
    selectedRunId ?? '',
    selectedRun?.status,
  );
  const { events } = usePenetrationTestEvents(
    orgId,
    selectedRunId ?? '',
    selectedRun?.status,
  );
  const { createReport, isCreating } = useCreatePenetrationTest(orgId);

  const showEmptyState =
    !listLoading &&
    reports.length === 0 &&
    selectedRunId === null &&
    mode !== 'create';
  const isCreateMode = mode === 'create';

  const handleCreateSubmit = async (
    payload: PentestCreateRequest,
  ): Promise<{ id: string }> => {
    try {
      const result = await createReport(payload);
      return { id: result.id };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start scan');
      throw err;
    }
  };

  const handleDownloadMarkdown = async () => {
    if (!selectedRun) return;
    await downloadArtifact({
      orgId,
      path: `/v1/security-penetration-tests/${encodeURIComponent(selectedRun.id)}/report`,
      filename: `penetration-test-${selectedRun.id}.md`,
    });
  };

  const handleDownloadPdf = async () => {
    if (!selectedRun) return;
    await downloadArtifact({
      orgId,
      path: `/v1/security-penetration-tests/${encodeURIComponent(selectedRun.id)}/pdf`,
      filename: `penetration-test-${selectedRun.id}.pdf`,
    });
  };

  const goToCreate = () =>
    router.push(`/${orgId}/security/penetration-tests/new`);

  // Empty state only shown when there are no runs AND no selection AND not
  // in create mode. Once there is at least one run we always render the
  // split view.
  if (showEmptyState) {
    return (
      <div className="pt-tokens h-[calc(100vh-4rem)]">
        <EmptyState onCreateClick={goToCreate} />
      </div>
    );
  }

  return (
    <div className="pt-tokens flex h-[calc(100vh-4rem)] min-h-0">
      <div
        aria-hidden={isCreateMode}
        className={isCreateMode ? 'pointer-events-none opacity-45' : ''}
      >
        <RunList
          orgId={orgId}
          runs={reports as PentestRun[]}
          selectedRunId={selectedRunId}
          onCreateClick={goToCreate}
          overviewActive={selectedRunId === null && !isCreateMode}
        />
      </div>
      <main className="flex-1 min-w-0 flex flex-col">
        {isCreateMode ? (
          <CreateRunPanel
            orgId={orgId}
            onSubmit={handleCreateSubmit}
            isSubmitting={isCreating}
          />
        ) : selectedRunId === null ? (
          <OverviewPane runs={reports as PentestRun[]} />
        ) : (
          <DetailPane
            run={selectedRun}
            issues={issues}
            events={events}
            isLoading={runLoading}
            error={runError}
            selectedFinding={selectedFinding}
            onOpenFinding={setSelectedFinding}
            onCloseFinding={() => setSelectedFinding(null)}
            onDownloadMarkdown={() => void handleDownloadMarkdown()}
            onDownloadPdf={() => void handleDownloadPdf()}
          />
        )}
      </main>
    </div>
  );
}

async function downloadArtifact({
  orgId,
  path,
  filename,
}: {
  orgId: string;
  path: string;
  filename?: string;
}) {
  try {
    const response = await api.raw(path, {
      method: 'GET',
      organizationId: orgId,
      headers: {
        Accept: filename ? 'application/pdf' : 'text/markdown',
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        safeErrorMessage(body) ?? `Request failed with status ${response.status}`,
      );
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename ?? 'penetration-test-report';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (err) {
    toast.error(
      err instanceof Error ? err.message : 'Unable to download report',
    );
  }
}

function safeErrorMessage(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? null;
  } catch {
    return body.length < 200 ? body : null;
  }
}
