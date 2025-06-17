'use client';

import type { Departments } from '@comp/db/types';
import { Button } from '@comp/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateEmployeeDepartment } from '../actions/update-department';

const DEPARTMENTS = [
  { value: 'admin', label: 'Admin' },
  { value: 'gov', label: 'Governance' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'itsm', label: 'IT Service Management' },
  { value: 'qms', label: 'Quality Management' },
  { value: 'none', label: 'None' },
];

interface EditableDepartmentProps {
  employeeId: string;
  currentDepartment: Departments;
  onSuccess?: () => void;
}

export function EditableDepartment({
  employeeId,
  currentDepartment,
  onSuccess,
}: EditableDepartmentProps) {
  const [department, setDepartment] = useState(currentDepartment);

  const { execute, status } = useAction(updateEmployeeDepartment, {
    onSuccess: () => {
      toast.success('Department updated successfully');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.error?.serverError || 'Failed to update department');
    },
  });

  const handleSave = () => {
    execute({ employeeId, department });
  };

  return (
    <div>
      <Select value={department} onValueChange={(value) => setDepartment(value as Departments)}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder="Select department" />
        </SelectTrigger>
        <SelectContent>
          {DEPARTMENTS.map((dept) => (
            <SelectItem key={dept.value} value={dept.value}>
              {dept.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
