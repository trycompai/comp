"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bubba/ui/select";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Departments } from "@bubba/db";
import { updateEvidenceDepartment } from "../actions/updateEvidenceDepartment";

interface DepartmentSectionProps {
  evidenceId: string;
  currentDepartment: string | null;
  onSuccess: () => Promise<void>;
}

export function DepartmentSection({
  evidenceId,
  currentDepartment,
  onSuccess,
}: DepartmentSectionProps) {
  const [department, setDepartment] = useState<string | null>(
    currentDepartment || null
  );

  const { execute: updateDepartment, isExecuting } = useAction(
    updateEvidenceDepartment,
    {
      onSuccess: async () => {
        toast.success("Department updated successfully");
        await onSuccess();
      },
      onError: (error) => {
        console.error("Error updating department:", error);
        toast.error("Failed to update department");
      },
    }
  );

  useEffect(() => {
    setDepartment(currentDepartment || null);
  }, [currentDepartment]);

  const handleDepartmentChange = (value: string) => {
    const newDepartment = value === "none" ? null : value;
    setDepartment(newDepartment);
    updateDepartment({ id: evidenceId, department: newDepartment });
  };

  const departmentOptions = Object.values(Departments).filter(
    (dept) => dept !== "none"
  );

  return (
    <Select
      value={department || "none"}
      onValueChange={handleDepartmentChange}
      disabled={isExecuting}
    >
      <SelectTrigger className="w-full h-9 text-sm">
        <SelectValue placeholder="Select department" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {departmentOptions.map((dept) => (
          <SelectItem key={dept} value={dept}>
            {dept.replace(/_/g, " ").toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
