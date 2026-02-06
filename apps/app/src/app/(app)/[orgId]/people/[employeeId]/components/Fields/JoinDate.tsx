'use client';

import { Button } from '@comp/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Calendar } from '@trycompai/design-system';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Control } from 'react-hook-form';
import type { EmployeeFormValues } from '../EmployeeDetails';

export const JoinDate = ({
  control,
  disabled,
}: {
  control: Control<EmployeeFormValues>;
  disabled: boolean;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name="createdAt"
      render={({ field }) => {
        return (
          <FormItem className="flex flex-col">
            <FormControl>
              <Popover open={disabled ? false : open} onOpenChange={disabled ? undefined : setOpen}>
                <FormLabel
                  htmlFor="date-picker-with-dropdowns-desktop"
                  className="text-muted-foreground text-xs font-medium uppercase"
                >
                  Join Date
                </FormLabel>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date-picker-with-dropdowns-desktop"
                    className="justify-start px-2.5 font-normal"
                    disabled={disabled}
                  >
                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    <ChevronDown className="ml-auto font-light size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => date && field.onChange(date)}
                    captionLayout="dropdown"
                    disabled={(date) => date > new Date()}
                  />
                  <div className="flex gap-2 border-t p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
