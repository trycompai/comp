'use client';

import { api } from '@/lib/api-client';
import type {
  PentestCreateRequest,
  PentestIssue,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { cn } from '@trycompai/design-system/cn';
import { ArrowLeft } from '@trycompai/design-system/icons';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import {
  getPentestAllowance,
  type PentestBillingStatusInput,
} from './pentest-allowance';
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
import { PenTestMarketingEmptyState } from './pen-test-marketing/PenTestMarketingEmptyState';
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
export function SplitView({ orgId, selectedRunId, mode = 'default' }: SplitViewProps) {
  const router = useRouter();
  const [selectedFinding, setSelectedFinding] = useState<PentestIssue | null>(null);

  const { reports, isLoading: listLoading } = usePenetrationTests(orgId);
  const {
    report: selectedRun,
    isLoading: runLoading,
    error: runError,
  } = usePenetrationTest(orgId, selectedRunId ?? '');
  const { issues } = usePenetrationTestIssues(orgId, selectedRunId ?? '', selectedRun?.status);
  const { events } = usePenetrationTestEvents(orgId, selectedRunId ?? '', selectedRun?.status);
  const { createReport, isCreating } = useCreatePenetrationTest(orgId);
  const { data: billingStatus } = useSWR<PentestBillingStatusInput>(
    orgId ? (['/v1/billing/status', orgId] as const) : null,
    async ([endpoint, organizationId]: readonly [string, string]) => {
      const response = await api.get<PentestBillingStatusInput>(
        endpoint,
        organizationId,
      );
      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.error ?? 'Failed to load billing status');
      }
      return response.data ?? {};
    },
  );
  const { balance, planRequired } = getPentestAllowance(billingStatus);
  const quotaLabel = 'Plan';

  // Marketing empty state — shown when the workspace has no pentest entitlement
  // (no active/trialing subscription and no wallet credit) AND has never run a
  // scan. Once either flips, fall through to the existing list / empty-state
  // surface. The boolean uses the universal `isMarketingStateEnabled` naming
  // so any feature that adopts <MarketingEmptyState> stays consistent.
  const isMarketingStateEnabled =
    !listLoading &&
    billingStatus !== undefined &&
    planRequired &&
    reports.length === 0 &&
    selectedRunId === null &&
    mode !== 'create';

  const showEmptyState =
    !listLoading &&
    reports.length === 0 &&
    selectedRunId === null &&
    mode !== 'create' &&
    !isMarketingStateEnabled;
  const isCreateMode = mode === 'create';

  const handleCreateSubmit = async (payload: PentestCreateRequest): Promise<{ id: string }> => {
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

  const goToCreate = () => router.push(`/${orgId}/security/penetration-tests/new`);
  const goToPentestPlans = () =>
    router.push(`/${orgId}/settings/billing/add-ons/penetration-tests`);
  const goToList = () => router.push(`/${orgId}/security/penetration-tests`);

  // Below `xl` (1280px) we show ONE pane at a time, picked from the URL —
  // list on `/pentests`, main on `/pentests/:id` and `/pentests/new`.
  // The `xl` cutoff (not `md`) covers tablets and narrower laptops where
  // the global rail + section sub-nav already eat ~345px before the
  // SplitView even starts; below xl, the IDE-style split squeezes the
  // main pane to <600px and the SevTally / detail header overflow.
  const showListOnMobile = selectedRunId === null && !isCreateMode;

  if (isMarketingStateEnabled) {
    return (
      <div className="pt-tokens -m-4 h-[calc(100vh-4rem)] md:-m-6">
        <PenTestMarketingEmptyState onViewPlans={goToPentestPlans} />
      </div>
    );
  }

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
          onCreateClick={balance === 0 ? goToPentestPlans : goToCreate}
          balance={balance}
          planRequired={planRequired}
          quotaLabel={quotaLabel}
        />
      </div>
    );
  }

  return (
    <div className="pt-tokens flex h-[calc(100vh-4rem)] min-h-0 -m-4 md:-m-6">
      <div
        aria-hidden={isCreateMode}
        className={cn(
          'w-full xl:w-auto xl:shrink-0',
          showListOnMobile ? 'block' : 'hidden xl:block',
          isCreateMode ? 'pointer-events-none opacity-45' : '',
        )}
      >
        <RunList
          orgId={orgId}
          runs={reports as PentestRun[]}
          selectedRunId={selectedRunId}
          onCreateClick={balance === 0 ? goToPentestPlans : goToCreate}
          balance={balance}
          planRequired={planRequired}
          quotaLabel={quotaLabel}
        />
      </div>
      <main className={cn('min-w-0 flex-1 flex-col', showListOnMobile ? 'hidden xl:flex' : 'flex')}>
        {/* Back-to-list bar shown below xl. The sidebar is hidden on
            phones / tablets / narrow laptops once a run is selected (or
            in create mode), so we surface a persistent path back to the
            list. xl+ never sees this — the sidebar itself is the
            navigation there. */}
        {!showListOnMobile && (
          <div className="xl:hidden flex items-center border-b border-border bg-background px-3 py-2">
            <button
              type="button"
              onClick={goToList}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Scans
            </button>
          </div>
        )}
        {isCreateMode ? (
          <CreateRunPanel
            orgId={orgId}
            onSubmit={handleCreateSubmit}
            isSubmitting={isCreating}
            balance={balance}
            planRequired={planRequired}
            quotaLabel={quotaLabel}
          />
        ) : selectedRunId === null ? (
          <OverviewPane
            orgId={orgId}
            runs={reports as PentestRun[]}
            onCreateClick={balance === 0 ? goToPentestPlans : goToCreate}
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
  const accept = filename?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/markdown';
  try {
    const response = await api.raw(path, {
      method: 'GET',
      organizationId: orgId,
      headers: { Accept: accept },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(safeErrorMessage(body) ?? `Request failed with status ${response.status}`);
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
    toast.error(err instanceof Error ? err.message : 'Unable to download report');
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
