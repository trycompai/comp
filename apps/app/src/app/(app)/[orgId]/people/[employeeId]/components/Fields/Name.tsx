import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

export const Name = ({
  control,
  disabled,
}: {
  control: Control<EmployeeFormValues>;
  disabled: boolean;
}) => {
  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            NAME
          </FormLabel>
          <FormControl>
            <Input {...field} placeholder="Employee name" className="h-10" disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
