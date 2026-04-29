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
  usePentestCredits,
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
  const { credits } = usePentestCredits(orgId);
  // Keep `balance` undefined while credits are loading. Coalescing to 0
  // would prematurely disable "+ New scan" before we know the user's
  // real balance — child props treat `undefined` as "loading, allow
  // optimistic UI" and a real `0` as "confirmed empty, block create."
  const balance = credits?.balance;
  const trialUsed =
    credits !== undefined && credits.balance === 0 && credits.totalGranted > 0;

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

  // Parameterized variants for surfaces that aren't tied to `selectedRun`
  // (the overview pane needs to download the latest run's report without
  // making the user click into it first).
  const handleDownloadMarkdownById = (runId: string) =>
    downloadArtifact({
      orgId,
      path: `/v1/security-penetration-tests/${encodeURIComponent(runId)}/report`,
      filename: `penetration-test-${runId}.md`,
    });

  const handleDownloadPdfById = (runId: string) =>
    downloadArtifact({
      orgId,
      path: `/v1/security-penetration-tests/${encodeURIComponent(runId)}/pdf`,
      filename: `penetration-test-${runId}.pdf`,
    });

  const goToCreate = () =>
    router.push(`/${orgId}/security/penetration-tests/new`);

  // Empty state only shown when there are no runs AND no selection AND not
  // in create mode. Once there is at least one run we always render the
  // split view.
  if (showEmptyState) {
    return (
      // Negative margins to escape the app-shell's `p-4 md:p-6` so the
      // pentest split-view renders edge-to-edge like an IDE rather than
      // as a padded card. The h-calc subtracts only the global topbar
      // (4rem); the outer shell padding is undone by `-m-*`.
      <div className="pt-tokens h-[calc(100vh-4rem)] -m-4 md:-m-6">
        <EmptyState
          onCreateClick={goToCreate}
          balance={balance}
          trialUsed={trialUsed}
        />
      </div>
    );
  }

  return (
    <div className="pt-tokens flex h-[calc(100vh-4rem)] min-h-0 -m-4 md:-m-6">
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
          balance={balance}
          trialUsed={trialUsed}
        />
      </div>
      <main className="flex-1 min-w-0 flex flex-col">
        {isCreateMode ? (
          <CreateRunPanel
            orgId={orgId}
            onSubmit={handleCreateSubmit}
            isSubmitting={isCreating}
            balance={balance}
            trialUsed={trialUsed}
          />
        ) : selectedRunId === null ? (
          <OverviewPane
            orgId={orgId}
            runs={reports as PentestRun[]}
            onCreateClick={goToCreate}
            canCreate={balance === undefined ? true : balance > 0}
            onDownloadMarkdown={handleDownloadMarkdownById}
            onDownloadPdf={handleDownloadPdfById}
          />
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
  // Derive the Accept header from the filename's extension, not from
  // whether `filename` is set — both Markdown and PDF callers pass a
  // filename, so the previous `filename ? pdf : md` check requested
  // application/pdf for both formats.
  const accept = filename?.toLowerCase().endsWith('.pdf')
    ? 'application/pdf'
    : 'text/markdown';
  try {
    const response = await api.raw(path, {
      method: 'GET',
      organizationId: orgId,
      headers: { Accept: accept },
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
