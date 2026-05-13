'use client';

import { useApi } from '@/hooks/use-api';
import { Popover, PopoverContent, PopoverTrigger } from '@trycompai/ui/popover';
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
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  const [onboardDate, setOnboardDate] = useState<Date | undefined>(
    employee.onboardDate ? new Date(employee.onboardDate) : undefined,
  );
  const [offboardDate, setOffboardDate] = useState<Date | undefined>(
    employee.offboardDate ? new Date(employee.offboardDate) : undefined,
  );
  const [onboardDatePickerOpen, setOnboardDatePickerOpen] = useState(false);
  const [offboardDatePickerOpen, setOffboardDatePickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const api = useApi();

  const hasChanges = useMemo(() => {
    const nameChanged = name !== (employee.user.name ?? '');
    const jobTitleChanged = jobTitle !== (employee.jobTitle ?? '');
    const departmentChanged = department !== (employee.department ?? 'none');
    const statusChanged = status !== (employee.isActive ? 'active' : 'inactive');
    const dateChanged = joinDate.toISOString() !== new Date(employee.createdAt).toISOString();
    const onboardDateChanged =
      (onboardDate?.toISOString() ?? null) !==
      (employee.onboardDate ? new Date(employee.onboardDate).toISOString() : null);
    const offboardDateChanged =
      (offboardDate?.toISOString() ?? null) !==
      (employee.offboardDate ? new Date(employee.offboardDate).toISOString() : null);

    return nameChanged || jobTitleChanged || departmentChanged || statusChanged || dateChanged || onboardDateChanged || offboardDateChanged;
  }, [name, jobTitle, department, status, joinDate, onboardDate, offboardDate, employee]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const updateData: {
      name?: string;
      department?: string;
      isActive?: boolean;
      createdAt?: string;
      jobTitle?: string;
      onboardDate?: string | null;
      offboardDate?: string | null;
    } = {};

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
      updateData.createdAt = joinDate.toISOString();
    }

    const isActive = status === 'active';
    if (isActive !== employee.isActive) {
      updateData.isActive = isActive;
    }

    const onboardDateChanged =
      (onboardDate?.toISOString() ?? null) !==
      (employee.onboardDate ? new Date(employee.onboardDate).toISOString() : null);
    if (onboardDateChanged) {
      updateData.onboardDate = onboardDate ? onboardDate.toISOString() : null;
    }

    const offboardDateChanged =
      (offboardDate?.toISOString() ?? null) !==
      (employee.offboardDate ? new Date(employee.offboardDate).toISOString() : null);
    if (offboardDateChanged) {
      updateData.offboardDate = offboardDate ? offboardDate.toISOString() : null;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.patch(`/v1/people/${employee.id}`, updateData);
      if (response.error) {
        toast.error(response.error || 'Failed to update employee details');
      } else {
        toast.success('Employee details updated successfully');
      }
    } catch {
      toast.error('Failed to update employee details');
    } finally {
      setIsLoading(false);
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
                    fromYear={2000}
                    toYear={new Date().getFullYear()}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </Stack>

            {/* Onboard Date Field */}
            <Stack gap="sm">
              <Label htmlFor="onboardDate">Onboard Date</Label>
              <Popover
                open={!canEdit ? false : onboardDatePickerOpen}
                onOpenChange={!canEdit ? undefined : setOnboardDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    id="onboardDate"
                    disabled={!canEdit}
                    className="border-border bg-background text-foreground hover:bg-muted flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {onboardDate ? format(onboardDate, 'PPP') : 'Not set'}
                    <ChevronDown size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={onboardDate}
                    onSelect={(date) => {
                      setOnboardDate(date ?? undefined);
                      setOnboardDatePickerOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 1}
                  />
                </PopoverContent>
              </Popover>
            </Stack>

            {/* Offboard Date Field */}
            <Stack gap="sm">
              <Label htmlFor="offboardDate">Offboard Date</Label>
              <Popover
                open={!canEdit ? false : offboardDatePickerOpen}
                onOpenChange={!canEdit ? undefined : setOffboardDatePickerOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    id="offboardDate"
                    disabled={!canEdit}
                    className="border-border bg-background text-foreground hover:bg-muted flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {offboardDate ? format(offboardDate, 'PPP') : 'Not set'}
                    <ChevronDown size={16} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={offboardDate}
                    onSelect={(date) => {
                      setOffboardDate(date ?? undefined);
                      setOffboardDatePickerOpen(false);
                    }}
                    captionLayout="dropdown"
                    fromYear={2000}
                    toYear={new Date().getFullYear() + 1}
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
