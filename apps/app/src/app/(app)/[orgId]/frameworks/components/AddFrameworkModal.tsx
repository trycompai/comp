'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { addFrameworksToOrganizationAction } from '@/actions/organization/add-frameworks-to-organization-action';
import { addFrameworksSchema } from '@/actions/schema';
import { FrameworkCard } from '@/components/framework-card';
import { Button } from '@comp/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import type { FrameworkEditorFramework } from '@db';

type Props = {
  onOpenChange: (isOpen: boolean) => void;
  availableFrameworks: Pick<
    FrameworkEditorFramework,
    'id' | 'name' | 'description' | 'version' | 'visible'
  >[];
  organizationId?: string;
};

export function AddFrameworkModal({ onOpenChange, availableFrameworks, organizationId }: Props) {
  const router = useRouter();

  const form = useForm<z.infer<typeof addFrameworksSchema>>({
    resolver: zodResolver(addFrameworksSchema),
    defaultValues: {
      frameworkIds: [],
      organizationId: organizationId,
    },
    mode: 'onChange',
  });

  const { execute, isExecuting } = useAction(addFrameworksToOrganizationAction, {
    onSuccess: (data) => {
      toast.success(
        `Successfully added ${data.data?.frameworksAdded ?? 0} framework${
          data.data?.frameworksAdded && data.data?.frameworksAdded > 1 ? 's' : ''
        }`,
      );
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      if (error.error.serverError) {
        toast.error(error.error.serverError);
      } else if (error.error.validationErrors) {
        const errorMessages = Object.values(error.error.validationErrors).flat().join(', ');
        toast.error(errorMessages || 'Validation error occurred');
      } else {
        toast.error('Failed to add frameworks');
      }
    },
  });

  const onSubmit = async (data: z.infer<typeof addFrameworksSchema>) => {
    execute(data);
  };

  const handleOpenChange = (open: boolean) => {
    if (isExecuting && !open) return;
    onOpenChange(open);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-base font-medium">Add Frameworks</DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          {availableFrameworks.length > 0
            ? 'Select the compliance frameworks to add to your organization.'
            : 'No new frameworks are available to add at this time.'}
        </DialogDescription>
      </DialogHeader>

      {!isExecuting && availableFrameworks.length > 0 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="frameworkIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Available Frameworks</FormLabel>
                  <FormControl>
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {availableFrameworks
                        .filter((framework) => framework.visible)
                        .map((framework) => (
                          <FrameworkCard
                            key={framework.id}
                            framework={framework}
                            isSelected={field.value.includes(framework.id)}
                            onSelectionChange={(checked) => {
                              const newValue = checked
                                ? [...field.value, framework.id]
                                : field.value.filter((id) => id !== framework.id);
                              field.onChange(newValue);
                            }}
                          />
                        ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={isExecuting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isExecuting || form.getValues('frameworkIds').length === 0}
              >
                {isExecuting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Add Selected
              </Button>
            </DialogFooter>
          </form>
        </Form>
      )}

      {!isExecuting && availableFrameworks.length === 0 && (
        <div className="py-6 text-center">
          <div className="text-muted-foreground text-sm">
            All available frameworks are already enabled in your organization.
          </div>
          <DialogFooter className="mt-6 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      )}

      {isExecuting && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <span className="text-muted-foreground ml-3 text-sm">Adding frameworks...</span>
        </div>
      )}
    </DialogContent>
  );
}
