'use client';

import { FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@comp/ui/popover';
import {
  Button,
  Calendar,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Label,
  Stack,
} from '@trycompai/design-system';
import { Calendar as CalendarIcon } from '@trycompai/design-system/icons';
import { format } from 'date-fns';
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
          <FormItem>
            <Stack gap="sm">
              <Label htmlFor="join-date">Join Date</Label>
              <FormControl>
                <Popover
                  open={disabled ? false : open}
                  onOpenChange={disabled ? undefined : setOpen}
                >
                  <PopoverTrigger asChild>
                    <InputGroup>
                      <InputGroupInput
                        id="join-date"
                        value={field.value ? format(field.value, 'PPP') : 'Pick a date'}
                        readOnly
                        disabled={disabled}
                        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                      />
                      <InputGroupAddon align="inline-end">
                        <CalendarIcon size={16} />
                      </InputGroupAddon>
                    </InputGroup>
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
                      <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </Stack>
          </FormItem>
        );
      }}
    />
  );
};
