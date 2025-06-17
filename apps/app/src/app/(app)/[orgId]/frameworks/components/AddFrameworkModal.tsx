'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@comp/ui/button';
import { Checkbox } from '@comp/ui/checkbox';
import { cn } from '@comp/ui/cn';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import type { FrameworkEditorFramework } from '@comp/db/types';
import { addFrameworksToOrganizationAction } from '@/actions/organization/add-frameworks-to-organization-action'; // Will create this action next
import { addFrameworksSchema } from '@/actions/schema'; // Will create/update this schema

type Props = {
  onOpenChange: (isOpen: boolean) => void;
  availableFrameworks: Pick<
    FrameworkEditorFramework,
    'id' | 'name' | 'description' | 'version' | 'visible'
  >[];
  organizationId: string;
};

export function AddFrameworkModal({ onOpenChange, availableFrameworks, organizationId }: Props) {
  const router = useRouter();
  const [isExecuting, setIsExecuting] = useState(false);

  const form = useForm<z.infer<typeof addFrameworksSchema>>({
    resolver: zodResolver(addFrameworksSchema),
    defaultValues: {
      frameworkIds: [],
      organizationId: organizationId,
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: z.infer<typeof addFrameworksSchema>) => {
    setIsExecuting(true);
    try {
      const result = await addFrameworksToOrganizationAction(data);
      if (result.success) {
        toast.success('Success'); // Assuming a generic success message
        onOpenChange(false);
        router.refresh(); // Refresh page to show new frameworks
      } else {
        toast.error(result.error || 'Error');
      }
    } catch (error) {
      toast.error('Error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (isExecuting && !open) return;
    onOpenChange(open);
  };

  return (
    <DialogContent className="max-w-[455px]">
      <DialogHeader className="my-4">
        <DialogTitle>{'Add New Frameworks'}</DialogTitle>
        <DialogDescription>
          {availableFrameworks.length > 0
            ? 'Select the compliance frameworks you want to add to your organization.'
            : 'There are no new frameworks available to add at this time.'}
        </DialogDescription>
      </DialogHeader>

      {!isExecuting && availableFrameworks.length > 0 && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            suppressHydrationWarning
          >
            <FormField
              control={form.control}
              name="frameworkIds"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium">{'Select Frameworks'}</FormLabel>
                  <FormControl>
                    <fieldset className="flex flex-col gap-2 select-none">
                      <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto">
                        {availableFrameworks
                          .filter((framework) => framework.visible)
                          .map((framework) => {
                            const frameworkId = framework.id;
                            return (
                              <label
                                key={frameworkId}
                                htmlFor={`add-framework-${frameworkId}`}
                                className={cn(
                                  'focus-within:ring-ring relative flex w-full cursor-pointer flex-col rounded-sm border p-4 text-left transition-colors focus-within:ring-2 focus-within:ring-offset-2',
                                  field.value.includes(frameworkId) &&
                                    'border-primary bg-primary/5',
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold">{framework.name}</h3>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                      {framework.description}
                                    </p>
                                    <p className="text-muted-foreground/75 mt-2 text-xs">
                                      {`${'Version'}: ${framework.version}`}
                                    </p>
                                  </div>
                                  <div>
                                    <Checkbox
                                      id={`add-framework-${frameworkId}`}
                                      checked={field.value.includes(frameworkId)}
                                      className="mt-1"
                                      onCheckedChange={(checked) => {
                                        const newValue = checked
                                          ? [...field.value, frameworkId]
                                          : field.value.filter((id) => id !== frameworkId);
                                        field.onChange(newValue);
                                      }}
                                    />
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </fieldset>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <div className="space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isExecuting}
                >
                  {'Cancel'}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isExecuting ||
                    form.getValues('frameworkIds').length === 0 ||
                    availableFrameworks.length === 0
                  }
                  suppressHydrationWarning
                >
                  {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {'Add'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      )}

      {!isExecuting && availableFrameworks.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-md text-foreground">
            {'All available frameworks are already enabled in your account.'}
          </p>
          <DialogFooter className="mt-8">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {'Close'}
            </Button>
          </DialogFooter>
        </div>
      )}

      {isExecuting && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="text-primary h-12 w-12 animate-spin" />
          <p className="text-muted-foreground ml-4">{'Adding frameworks...'}</p>
        </div>
      )}
    </DialogContent>
  );
}
