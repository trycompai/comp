import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { T, useGT } from 'gt-next';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

export const Name = ({ control }: { control: Control<EmployeeFormValues> }) => {
  const t = useGT();
  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            <T>NAME</T>
          </FormLabel>
          <FormControl>
            <Input {...field} placeholder={t('Employee name')} className="h-10" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
