"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type {
  FrameworkEditorControlTemplate,
  FrameworkEditorRequirement,
} from "@prisma/client";
import { Button } from "@comp/ui/button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@comp/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@comp/ui/dialog";
// If you need to link to individual requirement pages later, you can import Link:
// import Link from "next/link";

export function getColumns(
  onEdit: (requirement: FrameworkEditorRequirement) => void,
  onDelete: (requirement: FrameworkEditorRequirement) => void,
): ColumnDef<FrameworkEditorRequirement>[] {
  return [
    {
      accessorKey: "identifier",
      header: "Identifier",
      size: 150,
      cell: ({ row }) => {
        const identifier = row.getValue("identifier") as string;
        return identifier || "-";
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      size: 250,
      cell: ({ row }) => row.getValue("name"),
    },
    {
      accessorKey: "description",
      header: "Description",
      size: 420,
    },
    {
      accessorKey: "controlTemplates",
      header: "Linked Controls",
      size: 150,
      cell: ({ row }) => {
        const requirement = row.original as FrameworkEditorRequirement & {
          controlTemplates: FrameworkEditorControlTemplate[];
        };
        const controlsCount = requirement.controlTemplates.length;
        const controlTemplates = requirement.controlTemplates;

        if (controlsCount === 0) {
          return <Badge variant="secondary">{controlsCount}</Badge>;
        }

        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="h-auto p-0">
                <Badge
                  variant="secondary"
                  className="hover:bg-muted cursor-pointer"
                >
                  {controlsCount}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Mapped Control Templates</DialogTitle>
                <DialogDescription>
                  Showing all control templates linked to {requirement.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {controlTemplates.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {controlTemplates.map((control) => (
                      <li key={control.id}>{control.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No control templates linked.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      },
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => {
        const requirement = row.original;
        return (
          <div className="group flex h-full items-center justify-end gap-1 pr-2 text-right">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(requirement);
              }}
              title="Edit Requirement"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(requirement);
              }}
              title="Delete Requirement"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 100,
    },
  ];
}
