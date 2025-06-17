'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
// We will import the new type from the client page
import { Badge } from '@comp/ui/badge'; // Import the Badge component
import type { FrameworkWithCounts } from '../FrameworksClientPage';

// TODO: Replace 'any' with the actual Framework type from your database schema
// e.g., import type { Framework } from "@comp/db";
// For now, we'll use a placeholder type.
export interface Framework {
  id: string; // Assuming ID is a string, adjust if it's a number
  name: string;
  // Add other properties of a framework that you might want to display or use
}

export const columns: ColumnDef<FrameworkWithCounts>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    size: 200,
    cell: ({ row }) => {
      const framework = row.original;
      return (
        <Link href={`/frameworks/${framework.id}`} className="hover:underline">
          {framework.name}
        </Link>
      );
    },
  },
  {
    accessorKey: 'version',
    header: 'Version',
    size: 100, // Adjusted size
  },
  {
    accessorKey: 'visible',
    header: 'Status',
    size: 100,
    cell: ({ row }) => {
      const framework = row.original;
      return (
        <Badge variant={framework.visible ? 'default' : 'outline'}>
          {framework.visible ? 'Visible' : 'Hidden'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'requirementsCount',
    header: 'Requirements',
    size: 150, // Adjusted size
    cell: ({ row }) => <Badge variant="secondary">{row.original.requirementsCount}</Badge>,
  },
  {
    accessorKey: 'controlsCount',
    header: 'Controls',
    size: 150, // Adjusted size
    cell: ({ row }) => <Badge variant="secondary">{row.original.controlsCount}</Badge>,
  },
  {
    accessorKey: 'description',
    header: 'Description',
    size: 400, // Adjusted size
    minSize: 250, // Adjusted size
  },
  // Add more columns here if needed, for example:
  // {
  //   accessorKey: "createdAt",
  //   header: "Created At",
  //   cell: ({ row }) => {
  //     const date = new Date(row.getValue("createdAt"));
  //     return <span>{date.toLocaleDateString()}</span>;
  //   }
  // }
];
