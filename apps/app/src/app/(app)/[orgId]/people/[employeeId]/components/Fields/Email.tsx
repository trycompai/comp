import { FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { InputGroup, InputGroupInput, Label, Stack } from '@trycompai/design-system';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

export const Email = ({
  control,
  disabled,
}: {
  control: Control<EmployeeFormValues>;
  disabled: boolean;
}) => {
  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <Stack gap="sm">
            <Label htmlFor="email">Email</Label>
            <FormControl>
              <InputGroup>
                <InputGroupInput
                  id="email"
                  type="email"
                  {...field}
                  placeholder="Employee email"
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
