import { FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { InputGroup, InputGroupInput, Label, Stack } from '@trycompai/design-system';
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
        <FormItem>
          <Stack gap="sm">
            <Label htmlFor="name">Name</Label>
            <FormControl>
              <InputGroup>
                <InputGroupInput
                  id="name"
                  {...field}
                  placeholder="Employee name"
                  disabled={disabled}
                />
              </InputGroup>
            </FormControl>
            <FormMessage />
          </Stack>
        </FormItem>
      )}
    />
  );
};
