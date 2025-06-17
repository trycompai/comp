import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@comp/ui/form';
import { Button } from '@comp/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { cn } from '@comp/ui/cn';
import { Calendar } from '@comp/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

export const JoinDate = ({ control }: { control: Control<EmployeeFormValues> }) => {
  return (
    <FormField
      control={control}
      name="createdAt"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-muted-foreground text-xs font-medium uppercase">
            Join Date
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={'outline'}
                  className={cn(
                    'h-10 pl-3 text-left font-normal', // Use h-10 for consistency
                    !field.value && 'text-muted-foreground',
                  )}
                >
                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={
                  (date: Date) => date > new Date() // Explicitly type the date argument
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
