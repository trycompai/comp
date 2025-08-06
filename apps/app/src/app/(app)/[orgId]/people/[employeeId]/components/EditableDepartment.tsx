'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { Departments } from '@db';
import { T, useGT } from 'gt-next';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateEmployeeDepartment } from '../actions/update-department';

const getDepartments = (t: ReturnType<typeof useGT>) => [
  { value: 'admin', label: t('Admin') },
  { value: 'gov', label: t('Governance') },
  { value: 'hr', label: t('HR') },
  { value: 'it', label: t('IT') },
  { value: 'itsm', label: t('IT Service Management') },
  { value: 'qms', label: t('Quality Management') },
  { value: 'none', label: t('None') },
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
  const t = useGT();
  const DEPARTMENTS = getDepartments(t);

  const { execute, status } = useAction(updateEmployeeDepartment, {
    onSuccess: () => {
      toast.success(t('Department updated successfully'));
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error?.error?.serverError || t('Failed to update department'));
    },
  });

  const handleSave = () => {
    execute({ employeeId, department });
  };

  return (
    <div>
      <Select value={department} onValueChange={(value) => setDepartment(value as Departments)}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue placeholder={t('Select department')} />
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
