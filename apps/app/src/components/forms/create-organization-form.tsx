'use client';

import { createOrganizationAction } from '@/actions/organization/create-organization-action';
import { organizationSchema } from '@/actions/schema';
import { FrameworkCard } from '@/components/framework-card';
import { authClient } from '@/utils/auth-client';
import type { FrameworkEditorFramework } from '@comp/db/types';
import { Button } from '@comp/ui/button';
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
      toast.error('Failed to create organization');
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
        <div className="bg-card relative w-full max-w-md rounded-xs border p-8 shadow-sm">
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col justify-center space-y-6 duration-300">
            <div className="flex flex-col items-center justify-center space-y-4">
              <LogoSpinner />
              <div className="space-y-2 text-center">
                <h2 className="text-base font-medium tracking-tight">Creating your organization</h2>
                <p className="text-muted-foreground text-sm">This may take a minute or two...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6 md:p-8">
      <div className="bg-card relative w-full max-w-md rounded-xs border p-8 shadow-sm">
        <div className="mb-8 flex justify-between">
          <Link href="/">
            <Icons.Logo />
          </Link>
        </div>

        <div className="mb-8 space-y-3">
          <h1 className="text-xl font-medium tracking-tight">Welcome to Comp AI</h1>
          <p className="text-muted-foreground text-sm">
            Select the frameworks you use to get started. You can add more later.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="frameworkIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-normal">Available Frameworks</FormLabel>
                  <FormControl>
                    <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                      {frameworks
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

            <Button
              type="submit"
              className="w-full"
              size="sm"
              disabled={createOrganization.status === 'executing'}
            >
              {createOrganization.status === 'executing' && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              Get Started
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
