import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import type { Departments } from '@db';
import { T, useGT } from 'gt-next';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

const getDepartments = (
  t: (content: string) => string,
): { value: Departments; label: string }[] => [
  { value: 'admin', label: t('Admin') },
  { value: 'gov', label: t('Governance') },
  { value: 'hr', label: t('HR') },
  { value: 'it', label: t('IT') },
  { value: 'itsm', label: t('IT Service Management') },
  { value: 'qms', label: t('Quality Management') },
  { value: 'none', label: t('None') },
];

export const Department = ({ control }: { control: Control<EmployeeFormValues> }) => {
  const t = useGT();
  const departments = getDepartments(t);

  return (
    <FormField
      control={control}
      name="department"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            <T>Department</T>
          </FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
            <FormControl>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t('Select department')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.value} value={dept.value}>
                  {dept.label}
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
