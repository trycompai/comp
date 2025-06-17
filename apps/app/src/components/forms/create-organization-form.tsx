'use client';

import { createOrganizationAction } from '@/actions/organization/create-organization-action';
import { organizationSchema } from '@/actions/schema';
import { authClient } from '@/utils/auth-client';
import type { FrameworkEditorFramework } from '@comp/db/types';
import { Button } from '@comp/ui/button';
import { Checkbox } from '@comp/ui/checkbox';
import { cn } from '@comp/ui/cn';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Icons } from '@comp/ui/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendGTMEvent } from '@next/third-parties/google';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { LogoSpinner } from '../logo-spinner';

interface OnboardingClientProps {
  frameworks: Pick<
    FrameworkEditorFramework,
    'id' | 'name' | 'description' | 'version' | 'visible'
  >[];
}

export function OnboardingClient({ frameworks }: OnboardingClientProps) {
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const router = useRouter();
  const createOrganization = useAction(createOrganizationAction, {
    onSuccess: async () => {
      sendGTMEvent({
        event: 'conversion',
      });

      router.push('/');
    },
    onError: () => {
      toast.error('Error');
    },
    onExecute: () => {
      setIsCreatingOrganization(true);
    },
  });

  const onSubmit = async (data: z.infer<typeof organizationSchema>) => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();

    await authClient.organization.create({
      name: 'My Organization',
      slug: `my-organization-${randomSuffix}`,
    });

    createOrganization.execute({
      ...data,
    });
  };

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      frameworkIds: [],
    },
    mode: 'onChange',
  });

  if (isCreatingOrganization) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center p-6 md:p-8">
        <div className="bg-card relative w-full max-w-[440px] border p-8 shadow-lg">
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col justify-center space-y-4 duration-300">
            <div className="flex flex-col justify-center gap-2">
              <LogoSpinner />
              <h2 className="text-center text-xl font-semibold tracking-tight">
                {"Hold tight, we're creating your organization"}
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                {'This may take a minute or two...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6 md:p-8">
      <div className="bg-card relative w-full max-w-[440px] rounded-sm border p-8 shadow-lg">
        <div className="mb-8 flex justify-between">
          <Link href="/">
            <Icons.Logo />
          </Link>
        </div>

        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Comp AI</h1>
          <p className="text-muted-foreground text-sm">
            Select the frameworks you use to get started. You can add more later.
          </p>
        </div>

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
                      {frameworks
                        .filter((framework) => framework.visible)
                        .map((framework) => {
                          return (
                            <label
                              key={framework.id}
                              htmlFor={`framework-${framework.id}`}
                              className={cn(
                                'focus-within:ring-ring relative flex w-full cursor-pointer flex-col rounded-sm border p-4 text-left transition-colors focus-within:ring-2 focus-within:ring-offset-2',
                                field.value.includes(framework.id) && 'border-primary bg-primary/5',
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
                                    id={`framework-${framework.id}`}
                                    checked={field.value.includes(framework.id)}
                                    className="mt-1"
                                    onCheckedChange={(checked) => {
                                      const newValue = checked
                                        ? [...field.value, framework.id]
                                        : field.value.filter(
                                            (currentFrameworkId) =>
                                              currentFrameworkId !== framework.id,
                                          );
                                      field.onChange(newValue);
                                    }}
                                  />
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </fieldset>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createOrganization.status === 'executing'}
              suppressHydrationWarning
            >
              {createOrganization.status === 'executing' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {'Finish setup'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
