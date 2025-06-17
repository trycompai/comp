'use client';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import { useMemo, useState } from 'react';
import type { Host } from '../types/index';
import { getEmployeeDevicesColumns } from './EmployeeDevicesColumns';
import { HostDetails } from './HostDetails';

export const EmployeeDevicesList = ({ devices }: { devices: Host[] }) => {
  const [selectedRow, setSelectedRow] = useState<Host | null>(null);
  const columns = useMemo(() => getEmployeeDevicesColumns(), []);

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
