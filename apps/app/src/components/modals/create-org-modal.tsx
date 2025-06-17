'use client';

import { createOrganizationAction } from '@/actions/organization/create-organization-action';
import { organizationSchema } from '@/actions/schema';
import { FrameworkCard } from '@/components/framework-card';
import { authClient } from '@/utils/auth-client';
import type { FrameworkEditorFramework, Organization } from '@comp/db/types';
import { Button } from '@comp/ui/button';
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
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { LogoSpinner } from '../logo-spinner';

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
      toast.error('Failed to create organization', { duration: 5000 });
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
    <DialogContent className="max-w-md">
      <DialogHeader className="space-y-2">
        {!isExecuting ? (
          <>
            <DialogTitle className="text-base font-medium">Create Organization</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Select the compliance frameworks to get started with. You can add more later.
            </DialogDescription>
          </>
        ) : null}
      </DialogHeader>

      {isExecuting && (
        <div className="py-8">
          <div className="flex items-center justify-center">
            <div className="space-y-4 text-center">
              <LogoSpinner />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Creating your organization</h3>
                <p className="text-muted-foreground text-xs">This may take a minute or two...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isExecuting && !isSetup && (
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
              <Button type="submit" size="sm" disabled={createOrganization.status === 'executing'}>
                {createOrganization.status === 'executing' && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Create Organization
              </Button>
            </DialogFooter>
          </form>
        </Form>
      )}
    </DialogContent>
  );
}
