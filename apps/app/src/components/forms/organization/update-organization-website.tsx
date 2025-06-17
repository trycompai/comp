'use client';

import { updateOrganizationWebsiteAction } from '@/actions/organization/update-organization-website-action';
import { organizationWebsiteSchema } from '@/actions/schema';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateOrganizationWebsite({
  organizationWebsite,
}: {
  organizationWebsite: string;
}) {
  const updateOrganizationWebsite = useAction(updateOrganizationWebsiteAction, {
    onSuccess: () => {
      toast.success('Organization website updated');
    },
    onError: () => {
      toast.error('Error updating organization website');
    },
  });

  const form = useForm<z.infer<typeof organizationWebsiteSchema>>({
    resolver: zodResolver(organizationWebsiteSchema),
    defaultValues: {
      website: organizationWebsite,
    },
  });

  const onSubmit = (data: z.infer<typeof organizationWebsiteSchema>) => {
    updateOrganizationWebsite.execute(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{'Organization Website'}</CardTitle>

            <CardDescription>
              <div className="max-w-[600px]">
                {"This is your organization's official website. Include https:// in the URL."}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="website"
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
                      maxLength={255}
                      placeholder="https://example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-muted-foreground text-xs">
              {'Please enter a valid URL including https://'}
            </div>
            <Button type="submit" disabled={updateOrganizationWebsite.status === 'executing'}>
              {updateOrganizationWebsite.status === 'executing' ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              {'Save'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
