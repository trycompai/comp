"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableRow } from "@bubba/ui/table";
import { columns } from "./columns";
import { DataTableHeader } from "./data-table-header";
import { useRouter } from "next/navigation";
import type {
  OrganizationControlRequirement,
  OrganizationEvidence,
  OrganizationPolicy,
} from "@bubba/db";

// Define the type that matches what we receive from the hook
export type RequirementTableData = OrganizationControlRequirement & {
  organizationPolicy: OrganizationPolicy | null;
  organizationEvidence: OrganizationEvidence | null;
};

interface DataTableProps {
  data: RequirementTableData[];
}

export function DataTable({ data }: DataTableProps) {
  const router = useRouter();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const onRowClick = (requirement: RequirementTableData) => {
    console.log({
      requirement,
    });
    switch (requirement.type) {
      case "policy":
        if (requirement.organizationPolicyId) {
          router.push(`/policies/all/${requirement.organizationPolicyId}`);
        }
        break;
      case "evidence":
        if (requirement.organizationEvidenceId) {
          router.push(`/evidence/${requirement.organizationEvidenceId}`);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full">
      <div className="overflow-auto rounded-md border">
        <Table>
          <DataTableHeader table={table} />
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No requirements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
