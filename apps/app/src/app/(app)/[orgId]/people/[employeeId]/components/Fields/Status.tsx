import type { EmployeeStatusType } from '@/components/tables/people/employee-status';
import { FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
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

const STATUS_OPTIONS: { value: EmployeeStatusType; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Status color hex values for charts
export const EMPLOYEE_STATUS_HEX_COLORS: Record<EmployeeStatusType, string> = {
  inactive: 'var(--color-destructive)',
  active: 'var(--color-primary)',
};

export const Status = ({
  control,
  disabled,
}: {
  control: Control<EmployeeFormValues>;
  disabled: boolean;
}) => {
  return (
    <FormField
      control={control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <Stack gap="sm">
            <Label htmlFor="status">Status</Label>
            <FormControl>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5"
                        style={{
                          backgroundColor:
                            EMPLOYEE_STATUS_HEX_COLORS[field.value as EmployeeStatusType] ?? '',
                        }}
                      />
                      {STATUS_OPTIONS.find((o) => o.value === field.value)?.label ?? field.value}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2.5"
                          style={{
                            backgroundColor: EMPLOYEE_STATUS_HEX_COLORS[option.value] ?? '',
                          }}
                        />
                        {option.label}
                      </div>
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
