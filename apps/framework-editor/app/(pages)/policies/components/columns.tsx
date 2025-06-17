'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import type { FrameworkEditorPolicyTemplate } from '@prisma/client';

// Helper to format enum values (optional, you can do this inline too)
const formatEnumValue = (value: string) => {
  if (!value) return '';
  return (
    value.replace(/_/g, ' ').charAt(0).toUpperCase() +
    value.slice(1).toLowerCase().replace(/_/g, ' ')
  );
};

export const columns: ColumnDef<FrameworkEditorPolicyTemplate>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    size: 250,
    cell: ({ row }) => {
      const policy = row.original;
      return (
        <Link href={`/policies/${policy.id}`} className="hover:underline">
          {policy.name}
        </Link>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    size: 450,
    minSize: 300,
  },
  {
    accessorKey: 'frequency',
    header: 'Frequency',
    size: 150,
    cell: ({ row }) => formatEnumValue(row.getValue('frequency')),
  },
  {
    accessorKey: 'department',
    header: 'Department',
    size: 150,
    cell: ({ row }) => formatEnumValue(row.getValue('department')),
  },
  // Add other columns if needed, e.g., for 'content' or 'controlTemplates' (might need custom rendering)
];
