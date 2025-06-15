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

export const Name = ({ control }: { control: Control<EmployeeFormValues> }) => {
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
            <Input {...field} placeholder="Employee name" className="h-10" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
