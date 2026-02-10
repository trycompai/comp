'use client';

import { organizationWebsiteSchema } from '@/actions/schema';
import { useOrganizationMutations } from '@/hooks/use-organization-mutations';
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

export function UpdateOrganizationWebsite({
  organizationWebsite,
}: {
  organizationWebsite: string;
}) {
  const { updateOrganization } = useOrganizationMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof organizationWebsiteSchema>>({
    resolver: zodResolver(organizationWebsiteSchema),
    defaultValues: {
      website: organizationWebsite,
    },
  });

  const onSubmit = async (data: z.infer<typeof organizationWebsiteSchema>) => {
    setIsSubmitting(true);
    try {
      await updateOrganization({ website: data.website });
      toast.success('Organization website updated');
    } catch {
      toast.error('Error updating organization website');
    } finally {
      setIsSubmitting(false);
    }
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
            <Button type="submit" disabled={isSubmitting}>
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
