import type { EmployeeStatusType } from '@/components/tables/people/employee-status';
import { cn } from '@comp/ui/cn';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

const STATUS_OPTIONS: { value: EmployeeStatusType; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// Status color hex values for charts
export const EMPLOYEE_STATUS_HEX_COLORS: Record<EmployeeStatusType, string> = {
  inactive: '#ef4444',
  active: 'hsl(var(--chart-primary))',
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
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            Status
          </FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            value={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className={cn('flex items-center gap-2')}>
                    <div
                      className={cn('size-2.5')}
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
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
