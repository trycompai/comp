'use client';

import { DepartmentSelect } from '@/components/DepartmentSelect';
import { useApi } from '@/hooks/use-api';
import { Popover, PopoverContent, PopoverTrigger } from '@trycompai/ui/popover';
import type { Member, User } from '@db';
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
import { Calendar as CalendarIcon } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Mirrors the backend's @IsEmail() on UpdatePeopleDto.email so the form rejects
// values the PATCH /v1/people/:id endpoint would reject anyway.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (value: string) => EMAIL_REGEX.test(value);

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
  const [email, setEmail] = useState(employee.user.email ?? '');
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? '');
  const [department, setDepartment] = useState<string>(employee.department ?? 'none');
  const [status, setStatus] = useState<string>(employee.isActive ? 'active' : 'inactive');
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
    const emailChanged = email !== (employee.user.email ?? '');
    const jobTitleChanged = jobTitle !== (employee.jobTitle ?? '');
    const departmentChanged = department !== (employee.department ?? 'none');
    const statusChanged = status !== (employee.isActive ? 'active' : 'inactive');
    const onboardDateChanged =
      (onboardDate?.toISOString() ?? null) !==
      (employee.onboardDate ? new Date(employee.onboardDate).toISOString() : null);
    const offboardDateChanged =
      (offboardDate?.toISOString() ?? null) !==
      (employee.offboardDate ? new Date(employee.offboardDate).toISOString() : null);

    return nameChanged || emailChanged || jobTitleChanged || departmentChanged || statusChanged || onboardDateChanged || offboardDateChanged;
  }, [name, email, jobTitle, department, status, onboardDate, offboardDate, employee]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Email is required');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      toast.error('Enter a valid email address');
      return;
    }

    const updateData: {
      name?: string;
      email?: string;
      department?: string;
      isActive?: boolean;
      jobTitle?: string;
      onboardDate?: string | null;
      offboardDate?: string | null;
    } = {};

    if (name !== (employee.user.name ?? '')) {
      updateData.name = name;
    }
    if (trimmedEmail !== (employee.user.email ?? '')) {
      updateData.email = trimmedEmail;
    }
    if (jobTitle !== (employee.jobTitle ?? '')) {
      updateData.jobTitle = jobTitle;
    }
    if (department !== employee.department) {
      updateData.department = department;
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

            {/* Email Field (login email) */}
            <Stack gap="sm">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@example.com"
                disabled={!canEdit}
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
              <DepartmentSelect
                value={department}
                onChange={setDepartment}
                disabled={!canEdit}
              />
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
                    <CalendarIcon size={16} />
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
                    <CalendarIcon size={16} />
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
