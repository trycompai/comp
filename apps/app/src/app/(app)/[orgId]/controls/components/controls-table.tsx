'use client';

import * as React from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { useDataTable } from '@/hooks/use-data-table';
import type { Member, User } from '@db';
import { useParams } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { ControlWithRelations } from '../data/queries';
import { getControlColumns } from './controls-table-columns';
import { CreateControlSheet } from './CreateControlSheet';
import { CreateTaskSheet } from '../../tasks/components/CreateTaskSheet';

interface ControlsTableProps {
  promises: Promise<[{ data: ControlWithRelations[]; pageCount: number }]>;
  policies: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  requirements: {
    id: string;
    name: string;
    identifier: string;
    frameworkInstanceId: string;
    frameworkName: string;
  }[];
  members: (Member & { user: User })[];
  taskControls: { id: string; name: string }[];
}

export function ControlsTable({
  promises,
  policies,
  tasks,
  requirements,
  members,
  taskControls,
}: ControlsTableProps) {
  const [{ data, pageCount }] = React.use(promises);
  const { orgId } = useParams();
  const columns = React.useMemo(() => getControlColumns(), []);
  const [filteredData, setFilteredData] = React.useState<ControlWithRelations[]>(data);
  const [createTaskOpen, setCreateTaskOpen] = useQueryState('create-task');
  const [taskPrefill, setTaskPrefill] = React.useState<
    { title?: string; description?: string } | null
  >(null);
  const [taskPrefillControls, setTaskPrefillControls] = React.useState<string[] | undefined>();
  const [availableTaskControls, setAvailableTaskControls] = React.useState(taskControls);

  // For client-side filtering, we don't need to apply server-side filtering
  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: 'name', desc: true }],
    },
    getRowId: (row) => row.id,
    shallow: false,
    clearOnDefault: true,
  });

  React.useEffect(() => {
    if (!createTaskOpen) {
      setTaskPrefill(null);
      setTaskPrefillControls(undefined);
    }
  }, [createTaskOpen]);

  React.useEffect(() => {
    setAvailableTaskControls((prev) => {
      const dedup = new Map(prev.map((control) => [control.id, control]));
      for (const control of taskControls) {
        dedup.set(control.id, control);
      }
      return Array.from(dedup.values());
    });
  }, [taskControls]);

  const handleRequestCreateTask = React.useCallback(
    ({
      control,
      prefill,
    }: {
      control: { id: string; name: string; description: string | null };
      prefill: { title?: string; description?: string };
    }) => {
      setAvailableTaskControls((prev) => {
        if (prev.some((existing) => existing.id === control.id)) {
          return prev;
        }
        return [...prev, { id: control.id, name: control.name }];
      });
      setTaskPrefill(
        prefill ?? {
          title: control.name,
          description: control.description ?? undefined,
        },
      );
      setTaskPrefillControls([control.id]);
      void setCreateTaskOpen('true');
    },
    [setCreateTaskOpen],
  );

  return (
    <>
      <DataTable table={table} getRowId={(row) => row.id} rowClickBasePath={`/${orgId}/controls`}>
        <DataTableToolbar table={table} sheet="create-control" action="Create Control" />
      </DataTable>
      <CreateControlSheet
        policies={policies}
        tasks={tasks}
        requirements={requirements}
        onRequestCreateTask={handleRequestCreateTask}
      />
      <CreateTaskSheet
        members={members}
        controls={availableTaskControls}
        prefillTask={taskPrefill || undefined}
        prefillControls={taskPrefillControls}
      />
    </>
  );
}
