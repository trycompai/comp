'use client';

import { Button } from '@comp/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import { Calendar } from '@trycompai/design-system';
import { format, isValid, parse } from 'date-fns';
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
  const [inputValue, setInputValue] = useState('');

  return (
    <FormField
      control={control}
      name="createdAt"
      render={({ field }) => {
        const handleInputBlur = () => {
          if (!inputValue) return;

          const parsed = parse(inputValue, 'MM/dd/yyyy', new Date());
          if (isValid(parsed) && parsed <= new Date()) {
            field.onChange(parsed);
          }
          setInputValue('');
        };

        return (
          <FormItem className="flex flex-col">
            <FormControl>
              <Popover open={open} onOpenChange={setOpen}>
                <FormLabel
                  htmlFor="date-picker-with-dropdowns-desktop"
                  className="text-xs font-medium uppercase"
                >
                  Date
                </FormLabel>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date-picker-with-dropdowns-desktop"
                    className="justify-start px-2.5 font-normal"
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
