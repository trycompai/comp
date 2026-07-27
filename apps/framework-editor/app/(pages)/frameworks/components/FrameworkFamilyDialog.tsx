'use client';

import { apiClient } from '@/app/lib/api-client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@trycompai/ui/form';
import { Input } from '@trycompai/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/ui/select';
import { Textarea } from '@trycompai/ui/textarea';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import type { FrameworkFamilyWithCount } from '../FrameworksClientPage';
import { FrameworkFamilyBaseSchema } from '../schemas';
import { FRAMEWORK_FAMILY_STATUSES } from './family-status';

type FamilyFormValues = z.infer<typeof FrameworkFamilyBaseSchema>;

// Stops password managers (NordPass, 1Password, LastPass, Dashlane, Bitwarden)
// from popping autofill widgets over these non-credential fields.
const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-lpignore': 'true',
  'data-form-type': 'other',
  'data-bwignore': true,
} as const;

interface FrameworkFamilyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // When provided, the dialog edits this family; otherwise it creates a new one.
  family?: FrameworkFamilyWithCount | null;
}

export function FrameworkFamilyDialog({
  isOpen,
  onOpenChange,
  family,
}: FrameworkFamilyDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(family);

  const form = useForm<FamilyFormValues>({
    resolver: zodResolver(FrameworkFamilyBaseSchema),
    defaultValues: { name: '', description: '', status: 'hidden' },
    mode: 'onChange',
  });

  // Prefill on open (and when the target family changes).
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: family?.name ?? '',
        description: family?.description ?? '',
        status: family?.status ?? 'hidden',
      });
    }
  }, [isOpen, family, form]);

  async function onSubmit(values: FamilyFormValues) {
    try {
      if (isEdit && family) {
        await apiClient(`/framework-family/${family.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        toast.success('Framework family updated');
      } else {
        await apiClient('/framework-family', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        toast.success('Framework family created');
      }
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save framework family.';
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) form.reset();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Framework Family' : 'Create New Framework Family'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the family details below.'
              : "Fill in the details below to create a new framework family. This family should contain 1 or more pieces that relate to framework, including down-level controls. Click create when you're done."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-2 py-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Name</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="e.g., NIST SP800-53" {...NO_AUTOFILL} {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Description</FormLabel>
                  <FormControl className="col-span-3">
                    <Textarea
                      placeholder="What this family groups together"
                      {...NO_AUTOFILL}
                      {...field}
                    />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Status</FormLabel>
                  <FormControl className="col-span-3">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        {FRAMEWORK_FAMILY_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving...'
                  : isEdit
                    ? 'Save Changes'
                    : 'Create Family'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
