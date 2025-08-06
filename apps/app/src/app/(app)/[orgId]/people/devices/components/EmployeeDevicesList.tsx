'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useGT } from 'gt-next';
import { useMemo, useState } from 'react';
import type { Host } from '../types/index';
import { getGetEmployeeDevicesColumns } from './EmployeeDevicesColumns'; // This requires a t function to be passed into it
import { HostDetails } from './HostDetails';

export const EmployeeDevicesList = ({ devices }: { devices: Host[] }) => {
  const t = useGT();
  const [selectedRow, setSelectedRow] = useState<Host | null>(null);
  const columns = useMemo(() => getGetEmployeeDevicesColumns(t), [t]);

  const { table } = useDataTable({
    data: devices,
    columns,
    pageCount: 1,
    shallow: false,
    clearOnDefault: true,
  });

  if (selectedRow) {
    return <HostDetails host={selectedRow} onClose={() => setSelectedRow(null)} />;
  }

  return (
    <DataTable
      table={table}
      onRowClick={(row) => {
        setSelectedRow(row);
      }}
    >
      <DataTableToolbar table={table} />
    </DataTable>
  );
};
