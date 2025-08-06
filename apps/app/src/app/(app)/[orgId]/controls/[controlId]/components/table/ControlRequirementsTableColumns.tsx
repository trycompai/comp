'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useGT } from 'gt-next';
import type { RequirementTableData } from './ControlRequirementsTable';

export function ControlRequirementsTableColumns(): ColumnDef<RequirementTableData>[] {
  const t = useGT();

  return [
  {
    id: 'type',
    accessorKey: 'type',
    header: t('Type'),
    cell: ({ row }) => {
      const requirement = row.original;
      return requirement.policy ? t('policy') : requirement.task ? t('task') : '';
    },
    size: 100,
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: t('Description'),
    size: 1000,
    cell: ({ row }) => {
      const description = row.original.description || ''; // Default to empty string if null
      const maxLength = 300; // Increased character limit
      const displayText =
        description.length > maxLength ? `${description.substring(0, maxLength)}...` : description;

      return (
        <div className="w-full pr-4" title={description}>
          {displayText}
        </div>
      );
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: t('Status'),
    size: 80,
    cell: ({ row }) => {
      const requirement = row.original;
      const isCompleted = requirement.policy
        ? requirement.policy?.status === 'published'
        : requirement.task
          ? requirement.task?.status === 'done'
          : false;

      return (
        <div className="flex items-center justify-center">
          {isCompleted ? (
            <CheckCircle2 size={16} className="text-green-500" />
          ) : (
            <XCircle size={16} className="text-red-500" />
          )}
        </div>
      );
    },
  },
  ];
}
