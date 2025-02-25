"use client";

import { Button } from "@bubba/ui/button";
import { Badge } from "@bubba/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@bubba/ui/dropdown-menu";
import { CheckCircle2, Filter, XCircle, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@bubba/ui/avatar";
import { useEvidenceTable } from "../../hooks/useEvidenceTableContext";

export function FilterDropdown() {
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
    frequencies,
    departments,
    assignees,
    hasActiveFilters,
    clearFilters,
  } = useEvidenceTable();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 px-1 py-0">
              {(status ? 1 : 0) +
                (frequency ? 1 : 0) +
                (department ? 1 : 0) +
                (assigneeId ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={status === "published"}
          onCheckedChange={() => {
            setStatus(status === "published" ? null : "published");
            setPage("1"); // Reset to first page when filtering
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-500" />
            <span>Published</span>
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={status === "draft"}
          onCheckedChange={() => {
            setStatus(status === "draft" ? null : "draft");
            setPage("1"); // Reset to first page when filtering
          }}
        >
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <span>Draft</span>
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Filter by Frequency</DropdownMenuLabel>
        {frequencies.map((freq) => (
          <DropdownMenuCheckboxItem
            key={freq}
            checked={frequency === freq}
            onCheckedChange={() => {
              setFrequency(frequency === freq ? null : freq);
              setPage("1"); // Reset to first page when filtering
            }}
          >
            {freq}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Filter by Department</DropdownMenuLabel>
        {departments.map((dept) => (
          <DropdownMenuCheckboxItem
            key={dept}
            checked={department === dept}
            onCheckedChange={() => {
              setDepartment(department === dept ? null : dept);
              setPage("1"); // Reset to first page when filtering
            }}
          >
            <div className="flex items-center gap-2">
              <Building size={16} className="text-muted-foreground" />
              <span>{dept.replace(/_/g, " ").toUpperCase()}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel>Filter by Assignee</DropdownMenuLabel>
        {assignees.map((assignee) => (
          <DropdownMenuCheckboxItem
            key={assignee.id}
            checked={assigneeId === assignee.id}
            onCheckedChange={() => {
              setAssigneeId(assigneeId === assignee.id ? null : assignee.id);
              setPage("1"); // Reset to first page when filtering
            }}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage
                  src={assignee.image || undefined}
                  alt={assignee.name || ""}
                />
                <AvatarFallback className="text-xs">
                  {assignee.name ? assignee.name.charAt(0) : "?"}
                </AvatarFallback>
              </Avatar>
              <span>{assignee.name}</span>
            </div>
          </DropdownMenuCheckboxItem>
        ))}

        {hasActiveFilters && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm font-normal"
              onClick={clearFilters}
            >
              Clear all filters
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
