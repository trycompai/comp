import { FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import type { Departments } from '@db';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
} from '@trycompai/design-system';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

const DEPARTMENTS: { value: Departments; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'gov', label: 'Governance' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'itsm', label: 'IT Service Management' },
  { value: 'qms', label: 'Quality Management' },
  { value: 'none', label: 'None' },
];

export const Department = ({
  control,
  disabled,
}: {
  control: Control<EmployeeFormValues>;
  disabled: boolean;
}) => {
  return (
    <FormField
      control={control}
      name="department"
      render={({ field }) => (
        <FormItem>
          <Stack gap="sm">
            <Label htmlFor="department">Department</Label>
            <FormControl>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department">
                    {DEPARTMENTS.find((d) => d.value === field.value)?.label ?? field.value}
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
            </FormControl>
            <FormMessage />
          </Stack>
        </FormItem>
      )}
    />
  );
};
