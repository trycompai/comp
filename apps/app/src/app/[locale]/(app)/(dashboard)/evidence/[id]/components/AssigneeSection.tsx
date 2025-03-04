"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@bubba/ui/avatar";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { assignEvidence } from "../actions/assignEvidence";
import { useOrganizationAdmins } from "../hooks/useOrganizationAdmins";
import type { Admin } from "../hooks/useOrganizationAdmins";

interface AssigneeSectionProps {
  evidenceId: string;
  currentAssigneeId: string | null | undefined;
  onSuccess: () => Promise<void>;
}

export function AssigneeSection({
  evidenceId,
  currentAssigneeId,
  onSuccess,
}: AssigneeSectionProps) {
  const [assigneeId, setAssigneeId] = useState<string | null>(
    currentAssigneeId || null
  );
  const { data: admins, isLoading, error } = useOrganizationAdmins();
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

  const { execute: updateAssignee, isExecuting } = useAction(assignEvidence, {
    onSuccess: async () => {
      toast.success("Assignee updated successfully");
      await onSuccess();
    },
    onError: () => {
      toast.error("Failed to update assignee");
    },
  });

  useEffect(() => {
    setAssigneeId(currentAssigneeId || null);
  }, [currentAssigneeId]);

  useEffect(() => {
    if (admins && assigneeId) {
      const admin = admins.find((a) => a.id === assigneeId);
      setSelectedAdmin(admin || null);
    } else {
      setSelectedAdmin(null);
    }
  }, [admins, assigneeId]);

  const handleAssigneeChange = (value: string) => {
    const newAssigneeId = value === "none" ? null : value;
    setAssigneeId(newAssigneeId);

    if (newAssigneeId && admins) {
      const admin = admins.find((a) => a.id === newAssigneeId);
      setSelectedAdmin(admin || null);
    } else {
      setSelectedAdmin(null);
    }

    updateAssignee({ id: evidenceId, assigneeId: newAssigneeId });
  };

  if (isLoading) {
    return <div className="h-9 w-full animate-pulse rounded-md bg-muted" />;
  }

  if (error || !admins) {
    return <p className="text-sm text-red-500">Failed to load</p>;
  }

  return (
    <div className="w-full">
      <Select
        value={assigneeId || "none"}
        onValueChange={handleAssigneeChange}
        disabled={isExecuting}
      >
        <SelectTrigger className="w-full">
          {selectedAdmin ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage
                  src={selectedAdmin.image || undefined}
                  alt={selectedAdmin.name}
                />
                <AvatarFallback>{selectedAdmin.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedAdmin.name}</span>
            </div>
          ) : (
            <SelectValue placeholder="Assign to..." />
          )}
        </SelectTrigger>
        <SelectContent
          className="min-w-[var(--radix-select-trigger-width)] w-auto max-w-[250px] z-50"
          position="popper"
          sideOffset={5}
          align="start"
        >
          <SelectItem value="none" className="w-full p-0 overflow-hidden">
            <div className="py-1.5 px-3 w-full">
              <span className="pl-7">None</span>
            </div>
          </SelectItem>
          {admins.map((admin) => (
            <SelectItem
              key={admin.id}
              value={admin.id}
              className="w-full p-0 overflow-hidden"
            >
              <div className="flex items-center gap-2 py-1.5 px-3 w-full">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage
                    src={admin.image || undefined}
                    alt={admin.name}
                  />
                  <AvatarFallback>{admin.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{admin.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
