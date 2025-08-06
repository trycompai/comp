'use client';

import React from 'react';
import { updateOrganizationNameAction } from '@/actions/organization/update-organization-name-action';
import { getOrganizationNameSchema } from '@/actions/schema';
import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { T, useGT } from 'gt-next';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateOrganizationName({ organizationName }: { organizationName: string }) {
  const t = useGT();
  const organizationNameSchema = React.useMemo(() => getOrganizationNameSchema(t), [t]);
  
  const updateOrganizationName = useAction(updateOrganizationNameAction, {
    onSuccess: () => {
      toast.success(t('Organization name updated'));
    },
    onError: () => {
      toast.error(t('Error updating organization name'));
    },
  });

  const form = useForm<z.infer<typeof organizationNameSchema>>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: {
      name: organizationName,
    },
  });

  const onSubmit = (data: z.infer<ReturnType<typeof getOrganizationNameSchema>>) => {
    updateOrganizationName.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <T>
              <CardTitle>Organization name</CardTitle>
            </T>

            <T>
              <CardDescription>
                <div className="max-w-[600px]">
                  This is your organizations visible name. You should use the legal name of your organization.
                </div>
              </CardDescription>
            </T>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      className="md:max-w-[300px]"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      maxLength={32}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <T>
              <div className="text-muted-foreground text-xs">
                Please use 32 characters at maximum.
              </div>
            </T>
            <Button type="submit" disabled={updateOrganizationName.status === 'executing'}>
              {updateOrganizationName.status === 'executing' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              <T>Save</T>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
