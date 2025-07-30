'use client';

import { StatusIndicator } from '@/components/status-indicator';
import { isPolicyCompleted } from '@/lib/control-compliance';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comp/ui/tooltip';
import type { Control, Policy, Task } from '@db';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getControlStatus } from '../../../../../lib/utils';

export type OrganizationControlType = Control & {
  policies: Policy[];
};

export function RequirementControlsTableColumns({
  tasks,
}: {
  tasks: (Task & { controls: Control[] })[];
}): ColumnDef<OrganizationControlType>[] {
  const { orgId } = useParams<{ orgId: string }>();

  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Control',
      cell: ({ row }) => {
        return (
          <div className="flex w-[300px] flex-col">
            <Link href={`/${orgId}/controls/${row.original.id}`} className="flex flex-col">
              <span className="truncate font-medium">{row.original.name}</span>
            </Link>
          </div>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'policies',
      header: 'Status',
      cell: ({ row }) => {
        const controlData = row.original;
        const policies = controlData.policies || [];

        const status = getControlStatus(policies, tasks, controlData.id);

        const totalPolicies = policies.length;
        const completedPolicies = policies.filter(isPolicyCompleted).length;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-[200px]">
                  <StatusIndicator status={status} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p>Progress: {Math.round((completedPolicies / totalPolicies) * 100) || 0}%</p>
                  <p>
                    Completed: {completedPolicies}/{totalPolicies} policies
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
  ];
}
