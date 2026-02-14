'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import type { Departments, Member, User } from '@db';
import {
  Button,
  Calendar,
  Grid,
  HStack,
  Input,
  Label,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
} from '@trycompai/design-system';
import { ChevronDown } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useAction } from 'next-safe-action/hooks';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { updateEmployee } from '../actions/update-employee';

const DEPARTMENTS: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'gov', label: 'Governance' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'itsm', label: 'IT Service Management' },
  { value: 'qms', label: 'Quality Management' },
  { value: 'none', label: 'None' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const EmployeeDetails = ({
  employee,
  canEdit,
}: {
  employee: Member & {
    user: User;
  };
  canEdit: boolean;
}) => {
  const [name, setName] = useState(employee.user.name ?? '');
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? '');
  const [department, setDepartment] = useState<string>(employee.department ?? 'none');
  const [status, setStatus] = useState<string>(employee.isActive ? 'active' : 'inactive');
  const [joinDate, setJoinDate] = useState<Date>(new Date(employee.createdAt));
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { execute, status: actionStatus } = useAction(updateEmployee, {
    onSuccess: (res) => {
      if (!res?.data?.success) {
        toast.error(res?.data?.error?.message || 'Failed to update employee details');
        return;
      }
      toast.success('Employee details updated successfully');
    },
    onError: (error) => {
      toast.error(error?.error?.serverError || 'Failed to update employee details');
    },
  });

  const hasChanges = useMemo(() => {
    const nameChanged = name !== (employee.user.name ?? '');
    const jobTitleChanged = jobTitle !== (employee.jobTitle ?? '');
    const departmentChanged = department !== (employee.department ?? 'none');
    const statusChanged = status !== (employee.isActive ? 'active' : 'inactive');
    const dateChanged = joinDate.toISOString() !== new Date(employee.createdAt).toISOString();

    return nameChanged || jobTitleChanged || departmentChanged || statusChanged || dateChanged;
  }, [name, jobTitle, department, status, joinDate, employee]);

  const isLoading = actionStatus === 'executing';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const updateData: {
      employeeId: string;
      name?: string;
      department?: string;
      isActive?: boolean;
      createdAt?: Date;
      jobTitle?: string;
    } = { employeeId: employee.id };

    if (name !== (employee.user.name ?? '')) {
      updateData.name = name;
    }
    if (jobTitle !== (employee.jobTitle ?? '')) {
      updateData.jobTitle = jobTitle;
    }
    if (department !== employee.department) {
      updateData.department = department;
    }
    if (joinDate.toISOString() !== new Date(employee.createdAt).toISOString()) {
      updateData.createdAt = joinDate;
    }

    const isActive = status === 'active';
    if (isActive !== employee.isActive) {
      updateData.isActive = isActive;
    }

    if (Object.keys(updateData).length > 1) {
      execute(updateData);
    } else {
      toast.info('No changes to save');
    }
  };

  return (
    <Section>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Grid cols={{ base: '1', md: '2' }} gap="4">
            {/* Name Field */}
            <Stack gap="sm">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Employee name"
                disabled={!canEdit}
              />
            </Stack>

            {/* Email Field (read-only) */}
            <Stack gap="sm">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={employee.user.email ?? ''}
                disabled
                readOnly
              />
            </Stack>

            {/* Job Title Field */}
            <Stack gap="sm">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                disabled={!canEdit}
              />
            </Stack>

            {/* Department Field */}
            <Stack gap="sm">
              <Label htmlFor="department">Department</Label>
              <Select
                value={department}
                disabled={!canEdit}
                onValueChange={(value) => value && setDepartment(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department">
                    {DEPARTMENTS.find((d) => d.value === department)?.label ?? 'None'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>

            {/* Status Field */}
            <Stack gap="sm">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                disabled={!canEdit}
                onValueChange={(value) => value && setStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status">
                    {STATUS_OPTIONS.find((s) => s.value === status)?.label ?? 'Active'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>

            {/* Join Date Field */}
            <Stack gap="sm">
              <Label htmlFor="joinDate">Join Date</Label>
              <Popover
                open={!canEdit ? false : datePickerOpen}
                onOpenChange={!canEdit ? undefined : setDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={!canEdit}
                    className="border-border bg-background text-foreground hover:bg-muted flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {joinDate ? format(joinDate, 'PPP') : 'Pick a date'}
                    <ChevronDown size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={joinDate}
                    onSelect={(date) => date && setJoinDate(date)}
                    captionLayout="dropdown"
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </Stack>
          </Grid>

          <HStack justify="end">
            <Button
              type="submit"
              disabled={!hasChanges || isLoading || !canEdit}
              loading={isLoading}
            >
              Save
            </Button>
          </HStack>
        </Stack>
      </form>
    </Section>
  );
};
