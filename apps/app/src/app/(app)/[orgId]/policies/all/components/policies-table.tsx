'use client';

import * as React from 'react';
import { Download, Loader2 } from 'lucide-react';

import { Button } from '@comp/ui/button';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { CreatePolicySheet } from '@/components/sheets/create-policy-sheet';
import { useDataTable } from '@/hooks/use-data-table';
import { useParams } from 'next/navigation';
import { getPolicies } from '../data/queries';
import { getPolicyColumns } from './policies-table-columns';
import { downloadAllPolicies } from '@/lib/pdf-generator';
import { getLogsForPolicy } from '../../[policyId]/data';

interface PoliciesTableProps {
  promises: Promise<[Awaited<ReturnType<typeof getPolicies>>]>;
}

export function PoliciesTable({ promises }: PoliciesTableProps) {
  const [{ data, pageCount }] = React.use(promises);
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);
  const params = useParams();
  const orgId = params.orgId as string;

  const columns = React.useMemo(() => getPolicyColumns(orgId), [orgId]);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      columnPinning: { right: ['actions'] },
    },
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
        })
      );
      // Convert array of entries to an object
      return Object.fromEntries(logsEntries);
    };

    // Since handleDownloadAll is not async, we need to handle the async logic here
    fetchAllLogs().then((policyLogs) => {
      setIsDownloadingAll(false);
      downloadAllPolicies(data, policyLogs);
    });
  }

  return (
    <>
      <DataTable table={table} getRowId={(row) => row.id} rowClickBasePath={`/${orgId}/policies`}>
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
      </DataTable>
      <CreatePolicySheet />
    </>
  );
}
