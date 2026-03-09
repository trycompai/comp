'use client';

import { organizationNameSchema } from '@/actions/schema';
import { useOrganizationMutations } from '@/hooks/use-organization-mutations';
import { usePermissions } from '@/hooks/use-permissions';
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

export function UpdateOrganizationName({ organizationName }: { organizationName: string }) {
  const { updateOrganization } = useOrganizationMutations();
  const { hasPermission } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof organizationNameSchema>>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: {
      name: organizationName,
    },
  });

  const onSubmit = async (data: z.infer<typeof organizationNameSchema>) => {
    setIsSubmitting(true);
    try {
      await updateOrganization({ name: data.name });
      toast.success('Organization name updated');
    } catch {
      toast.error('Error updating organization name');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{'Organization name'}</CardTitle>

            <CardDescription>
              <div className="max-w-[600px]">
                {
                  'This is your organizations visible name. You should use the legal name of your organization.'
                }
              </div>
            </CardDescription>
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
                      disabled={!hasPermission('organization', 'update')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-muted-foreground text-xs">
              {'Please use 32 characters at maximum.'}
            </div>
            <Button type="submit" disabled={isSubmitting || !hasPermission('organization', 'update')}>
              {isSubmitting ? (
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
