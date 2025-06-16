import type { Control } from "react-hook-form";
import type { EmployeeFormValues } from "../EmployeeDetails";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@comp/ui/form";
import { Input } from "@comp/ui/input";

export const Email = ({
  control,
}: {
  control: Control<EmployeeFormValues>;
}) => {
  return (
    <FormField
      control={control}
      name="email"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            EMAIL
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="email"
              placeholder="Employee email"
              className="h-10"
              disabled
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
