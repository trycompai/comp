'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { Download, Loader2 } from 'lucide-react';
import * as React from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { downloadAllPolicies } from '@/lib/pdf-generator';
import { Button } from '@comp/ui/button';
import type { Policy } from '@db';
import { useParams } from 'next/navigation';
import { getLogsForPolicy } from '../../[policyId]/data';
import { getPolicies } from '../data/queries';
import { getPolicyColumns } from './policies-table-columns';
import { type PolicyTailoringStatus, PolicyTailoringProvider } from './policy-tailoring-context';

interface PoliciesTableProps {
  promises: Promise<[Awaited<ReturnType<typeof getPolicies>>]>;
  onboardingRunId?: string | null;
}

type PolicyStatusMap = Record<string, PolicyTailoringStatus>;
const ACTIVE_POLICY_STATUSES: PolicyTailoringStatus[] = ['queued', 'pending', 'processing'];

export function PoliciesTable({ promises, onboardingRunId }: PoliciesTableProps) {
  const [{ data, pageCount }] = React.use(promises);
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);
  const params = useParams();
  const orgId = params.orgId as string;

  const shouldSubscribeToRun = Boolean(onboardingRunId);
  const { run } = useRealtimeRun(shouldSubscribeToRun ? onboardingRunId! : '', {
    enabled: shouldSubscribeToRun,
  });

  const policyStatuses = React.useMemo<PolicyStatusMap>(() => {
    if (!run?.metadata) {
      return {};
    }

    const meta = run.metadata as Record<string, unknown>;
    const policiesInfo = (meta.policiesInfo as Array<{ id: string }>) || [];

    return policiesInfo.reduce<PolicyStatusMap>((acc, policy) => {
      const statusKey = `policy_${policy.id}_status`;
      const status = meta[statusKey];

      if (
        status === 'queued' ||
        status === 'pending' ||
        status === 'processing' ||
        status === 'completed'
      ) {
        acc[policy.id] = status;
      }
      return acc;
    }, {});
  }, [run?.metadata]);

  const policyProgress = React.useMemo(() => {
    if (!run?.metadata) return null;

    const meta = run.metadata as Record<string, unknown>;
    const total = typeof meta.policiesTotal === 'number' ? (meta.policiesTotal as number) : 0;
    const completed =
      typeof meta.policiesCompleted === 'number' ? (meta.policiesCompleted as number) : 0;

    if (total === 0) {
      return null;
    }

    return { total, completed };
  }, [run?.metadata]);

  const hasActivePolicies =
    policyProgress !== null && policyProgress.completed < policyProgress.total;

  const columns = React.useMemo(() => getPolicyColumns(orgId), [orgId]);

  const effectivePolicyStatuses = React.useMemo<PolicyStatusMap>(() => {
    if (!shouldSubscribeToRun) {
      return policyStatuses;
    }

    const fallbackStatuses: PolicyStatusMap = { ...policyStatuses };
    data.forEach((policy) => {
      if (!fallbackStatuses[policy.id]) {
        fallbackStatuses[policy.id] = 'queued';
      }
    });
    return fallbackStatuses;
  }, [policyStatuses, data, shouldSubscribeToRun]);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    getRowId: (originalRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  const handleDownloadAll = () => {
    setIsDownloadingAll(true);
    // Fetch logs for all policies
    const fetchAllLogs = async () => {
      const logsEntries = await Promise.all(
        data.map(async (policy) => {
          const logs = await getLogsForPolicy(policy.id);
          return [policy.id, logs] as const;
        }),
      );
      // Convert array of entries to an object
      return Object.fromEntries(logsEntries);
    };

    // Since handleDownloadAll is not async, we need to handle the async logic here
    fetchAllLogs().then((policyLogs) => {
      setIsDownloadingAll(false);
      downloadAllPolicies(data, policyLogs);
    });
  };

  const getRowProps = React.useCallback(
    (policy: Policy) => {
      const status = effectivePolicyStatuses[policy.id];
      const isBlocked = status && ACTIVE_POLICY_STATUSES.includes(status);

      if (!isBlocked) {
        return {};
      }

      return {
        disabled: true,
        className:
          'relative bg-muted/40 opacity-70 pointer-events-none after:absolute after:inset-0 after:bg-background/40 after:content-[""] after:animate-pulse',
      };
    },
    [effectivePolicyStatuses],
  );

  return (
    <>
      <PolicyTailoringProvider statuses={effectivePolicyStatuses}>
        <DataTable
          table={table}
          getRowId={(row) => row.id}
          rowClickBasePath={`/${orgId}/policies`}
          getRowProps={getRowProps}
        >
          <>
            <DataTableToolbar table={table} sheet="create-policy-sheet" action="Create Policy">
              {/* <DataTableSortList table={table} align="end" /> */}
              {data.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll}
                >
                  {isDownloadingAll ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      Downloading...
                    </span>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download All
                    </>
                  )}
                </Button>
              )}
            </DataTableToolbar>

            {hasActivePolicies && policyProgress && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-primary">Tailoring your policies</span>
                  <span className="text-xs text-muted-foreground">
                    Personalized {policyProgress.completed}/{policyProgress.total} policies
                  </span>
                </div>
              </div>
            )}
          </>
        </DataTable>
      </PolicyTailoringProvider>
      <CreatePolicySheet />
    </>
  );
}
