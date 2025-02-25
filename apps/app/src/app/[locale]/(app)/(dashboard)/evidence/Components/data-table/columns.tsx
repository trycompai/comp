"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, XCircle, Building } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@bubba/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@bubba/ui/avatar";
import type { EvidenceTaskRow } from "./types";
import { calculateNextReview } from "@/lib/utils/calculate-next-review";
import { format } from "date-fns";

export const columns: ColumnDef<EvidenceTaskRow>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Name",
    enableResizing: true,
    enableSorting: true,
    size: 100,
    minSize: 200,
    cell: ({ row }) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild className="w-full">
            <div>{row.original.name}</div>
          </TooltipTrigger>
          <TooltipContent>{row.original.description}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  },
  {
    id: "status",
    accessorKey: "published",
    header: "Status",
    enableResizing: true,
    enableSorting: true,
    size: 150,
    minSize: 120,
    cell: ({ row }) => {
      const isPublished = row.original.published;
      const label = isPublished ? "Published" : "Draft";

      return (
        <div className="flex gap-2">
          {isPublished ? (
            <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          ) : (
            <XCircle size={16} className="text-red-500 shrink-0" />
          )}
          <span
            className={
              isPublished ? "text-sm text-green-600" : "text-sm text-red-600"
            }
          >
            {label}
          </span>
        </div>
      );
    },
  },
  {
    id: "department",
    accessorKey: "department",
    header: "Department",
    size: 150,
    enableResizing: true,
    minSize: 130,
    enableSorting: true,
    cell: ({ row }) => {
      const department = row.original.department;
      if (!department || department === "none")
        return <div className="text-muted-foreground text-sm">None</div>;

      return (
        <div className="flex items-center gap-2">
          <Building size={16} className="text-muted-foreground shrink-0" />
          <span className="truncate text-sm">
            {department.replace(/_/g, " ").toUpperCase()}
          </span>
        </div>
      );
    },
  },
  {
    id: "frequency",
    accessorKey: "frequency",
    header: "Frequency",
    size: 150,
    enableResizing: true,
    minSize: 130,
    enableSorting: true,
    cell: ({ row }) => {
      const frequency = row.original.frequency;
      if (!frequency) return null;

      return <div className="truncate">{frequency}</div>;
    },
  },
  {
    id: "nextReviewDate",
    accessorKey: "nextReviewDate",
    header: "Next Review Date",
    size: 150,
    enableResizing: true,
    minSize: 180,
    enableSorting: true,
    cell: ({ row }) => {
      if (row.original.lastPublishedAt === null) {
        return <div className="truncate text-red-500 font-medium">ASAP</div>;
      }

      const reviewInfo = calculateNextReview(
        row.original.lastPublishedAt,
        row.original.frequency
      );

      if (!reviewInfo) return null;

      return (
        <div
          className={`truncate ${reviewInfo.isUrgent ? "text-red-500" : ""}`}
        >
          {reviewInfo.daysUntil} days (
          {format(reviewInfo.nextReviewDate, "MM/dd/yyyy")})
        </div>
      );
    },
  },
  {
    id: "assignee",
    accessorKey: "assignee",
    header: "Assignee",
    enableResizing: true,
    enableSorting: true,
    size: 150,
    minSize: 150,
    cell: ({ row }) => {
      const assignee = row.original.assignee;

      if (!assignee) {
        return <div className="text-muted-foreground text-sm">Unassigned</div>;
      }

      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage
              src={assignee.image || undefined}
              alt={assignee.name || ""}
            />
            <AvatarFallback>
              {assignee.name ? assignee.name.charAt(0) : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{assignee.name}</span>
        </div>
      );
    },
  },
];
