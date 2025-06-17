'use client';

import { createOrganizationAction } from '@/actions/organization/create-organization-action';
import { organizationSchema } from '@/actions/schema';
import { authClient } from '@/utils/auth-client';
import type { Organization } from '@comp/db/types';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { LogoSpinner } from '../logo-spinner';
import { useRouter } from 'next/navigation';
import type { FrameworkEditorFramework } from '@comp/db/types';

type Props = {
  onOpenChange: (isOpen: boolean) => void;
  frameworks: Pick<
    FrameworkEditorFramework,
    'id' | 'name' | 'description' | 'version' | 'visible'
  >[];
};

export function CreateOrgModal({ onOpenChange, frameworks }: Props) {
  const [isSetup, setIsSetup] = useState(false);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newOrganizationRef = useRef<Pick<Organization, 'id' | 'name' | 'website'> | null>(null);

  const [formData, setFormData] = useState<z.infer<typeof organizationSchema> | null>(null);

  const createOrganization = useAction(createOrganizationAction, {
    onSuccess: async (data) => {
      if (data.data?.organizationId) {
        newOrganizationRef.current = {
          id: data.data.organizationId,
          name: '',
          website: '',
        };

        router.push(`/${data.data.organizationId}`);
      } else {
        newOrganizationRef.current = null;
      }
    },
    onError: () => {
      toast.error('Error', { duration: 5000 });
    },
  });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      frameworkIds: [],
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: z.infer<typeof organizationSchema>) => {
    setIsSubmitting(true);
    const randomSuffix = Math.random().toString(36).substring(2, 15);

    await authClient.organization
      .create({
        name: 'My Organization',
        slug: `my-organization-${randomSuffix}`,
      })
      .then(async (organization) => {
        setFormData(data);
        setIsSetup(true);

        createOrganization.execute(data);

        await authClient.organization.setActive({
          organizationId: organization.data?.id,
        });

        router.push(`/${organization.data?.id}`);
        onOpenChange(false);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const isExecuting = createOrganization.status === 'executing' || isSubmitting;

  // Prevent dialog from closing when executing
  const handleOpenChange = (open: boolean) => {
    if (isExecuting && !open) return;
    onOpenChange(open);
  };

  // Don't render modal at all while submitting/redirecting
  if (isSubmitting) return null;

  return (
    <DialogContent className="max-w-[455px]">
      <DialogHeader className="my-4">
        {!isExecuting ? (
          <>
            <DialogTitle>{'Create an organization'}</DialogTitle>
            <DialogDescription>
              {
                'Tell us a bit about your organization and what framework(s) you want to get started with.'
              }
            </DialogDescription>
          </>
        ) : (
          <></>
        )}
      </DialogHeader>

      {isExecuting && (
        <div className="mt-4">
          <div className="bg-background flex items-center justify-center p-6 md:p-8">
            <div className="bg-card relative w-full max-w-[440px] p-8 shadow-lg">
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
        </div>
      )}

      {!isExecuting && !isSetup && (
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
                        {frameworks
                          .filter((framework) => framework.visible)
                          .map((framework) => {
                            const frameworkId = framework.id;
                            return (
                              <label
                                key={frameworkId}
                                htmlFor={`framework-${frameworkId}`}
                                className={cn(
                                  'focus-within:ring-ring relative flex w-full cursor-pointer flex-col border p-4 text-left transition-colors focus-within:ring-2 focus-within:ring-offset-2',
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
                                      id={`framework-${frameworkId}`}
                                      checked={field.value.includes(frameworkId)}
                                      className="mt-1"
                                      onCheckedChange={(checked) => {
                                        const newValue = checked
                                          ? [...field.value, frameworkId]
                                          : field.value.filter((name) => name !== frameworkId);
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
            <div className="mt-6 mb-6">
              <DialogFooter>
                <div className="space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isExecuting}
                  >
                    {'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createOrganization.status === 'executing'}
                    suppressHydrationWarning
                  >
                    {createOrganization.status === 'executing' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {'Finish setup'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </form>
        </Form>
      )}
    </DialogContent>
  );
}
