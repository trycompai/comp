"use client";

import { Badge } from "@bubba/ui/badge";
import { X } from "lucide-react";
import { useEvidenceTable } from "../../hooks/useEvidenceTableContext";

export function ActiveFilterBadges() {
  const {
    status,
    setStatus,
    frequency,
    setFrequency,
    department,
    setDepartment,
    assigneeId,
    setAssigneeId,
    setPage,
    assignees,
  } = useEvidenceTable();

  // Find the assignee name if there's an active assignee filter
  const assigneeName = assigneeId
    ? assignees.find((a) => a.id === assigneeId)?.name || "Unknown"
    : null;

  // Only render if there are active filters
  if (!status && !frequency && !department && !assigneeId) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {status && (
        <Badge variant="outline" className="flex items-center gap-1">
          Status: {status}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => {
              setStatus(null);
              setPage("1");
            }}
          />
        </Badge>
      )}
      {frequency && (
        <Badge variant="outline" className="flex items-center gap-1">
          Frequency: {frequency}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => {
              setFrequency(null);
              setPage("1");
            }}
          />
        </Badge>
      )}
      {department && (
        <Badge variant="outline" className="flex items-center gap-1">
          Department: {department.replace(/_/g, " ").toUpperCase()}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => {
              setDepartment(null);
              setPage("1");
            }}
          />
        </Badge>
      )}
      {assigneeId && assigneeName && (
        <Badge variant="outline" className="flex items-center gap-1">
          Assignee: {assigneeName}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => {
              setAssigneeId(null);
              setPage("1");
            }}
          />
        </Badge>
      )}
    </div>
  );
}
