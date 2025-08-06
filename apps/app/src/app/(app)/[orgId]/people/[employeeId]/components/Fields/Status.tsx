import type { EmployeeStatusType } from '@/components/tables/people/employee-status';
import { cn } from '@comp/ui/cn';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { T, useGT } from 'gt-next';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

const getStatusOptions = (
  t: (key: string) => string,
): { value: EmployeeStatusType; label: string }[] => [
  { value: 'active', label: t('Active') },
  { value: 'inactive', label: t('Inactive') },
];

// Status color hex values for charts
export const EMPLOYEE_STATUS_HEX_COLORS: Record<EmployeeStatusType, string> = {
  inactive: '#ef4444',
  active: '#10b981',
};

export const Status = ({ control }: { control: Control<EmployeeFormValues> }) => {
  const t = useGT();
  const statusOptions = getStatusOptions(t);

  return (
    <FormField
      control={control}
      name="status"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            <T>Status</T>
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
            <FormControl>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t('Select status')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {statusOptions.map((option) => (
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
