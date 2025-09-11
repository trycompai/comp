'use client';

import { updateOrganizationAdvancedModeAction } from '@/actions/organization/update-organization-advanced-mode-action';
import { organizationAdvancedModeSchema } from '@/actions/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { Switch } from '@comp/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateOrganizationAdvancedMode({
  advancedModeEnabled,
}: {
  advancedModeEnabled: boolean;
}) {
  const updateAdvancedMode = useAction(updateOrganizationAdvancedModeAction, {
    onSuccess: () => {
      toast.success('Advanced mode setting updated');
    },
    onError: () => {
      toast.error('Error updating advanced mode setting');
    },
  });

  const form = useForm<z.infer<typeof organizationAdvancedModeSchema>>({
    resolver: zodResolver(organizationAdvancedModeSchema),
    defaultValues: {
      advancedModeEnabled,
    },
  });

  const onSubmit = (data: z.infer<typeof organizationAdvancedModeSchema>) => {
    updateAdvancedMode.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Mode</CardTitle>
            <CardDescription>
              <div className="max-w-[600px]">
                Enable advanced mode to access additional features like the Controls page. This
                setting is designed for users who need access to more detailed compliance management
                tools.
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="advancedModeEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xs border p-3">
                  <div className="space-y-0.5">
                    <div className="text-base">Advanced Mode</div>
                    <div className="text-muted-foreground text-sm">
                      Show advanced features and pages
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        // Auto-submit when switch is toggled
                        form.handleSubmit(onSubmit)();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-muted-foreground text-xs">
              Changes are saved automatically when toggled.
            </div>
            {updateAdvancedMode.status === 'executing' && (
              <div className="flex items-center text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
