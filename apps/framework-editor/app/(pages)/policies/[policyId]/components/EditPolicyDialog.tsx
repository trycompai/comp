'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Departments, type FrameworkEditorPolicyTemplate, Frequency } from '@/db';
import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/ui';
import { apiClient } from '@/app/lib/api-client';

// Schema for the form, consistent with server action
const EditPolicySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullish(),
  frequency: z.nativeEnum(Frequency),
  department: z.nativeEnum(Departments),
});

type EditPolicyFormValues = z.infer<typeof EditPolicySchema>;

interface EditPolicyDialogProps {
  policy: FrameworkEditorPolicyTemplate;
  isOpen: boolean;
  onClose: () => void;
  onPolicyUpdated: () => void; // Callback after successful update
}

export function EditPolicyDialog({
  policy,
  isOpen,
  onClose,
  onPolicyUpdated,
}: EditPolicyDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditPolicyFormValues>({
    resolver: zodResolver(EditPolicySchema),
    defaultValues: {
      name: policy.name || '',
      description: policy.description || '',
      frequency: policy.frequency || Frequency.yearly, // Default if null
      department: policy.department || Departments.none, // Default if null
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: policy.name || '',
        description: policy.description || '',
        frequency: policy.frequency || Frequency.yearly,
        department: policy.department || Departments.none,
      });
    }
  }, [isOpen, policy, form]);

  const onSubmit = (values: EditPolicyFormValues) => {
    startTransition(async () => {
      try {
        await apiClient(`/policy-template/${policy.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        toast.success('Policy updated successfully!');
        onPolicyUpdated();
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update policy.';
        toast.error(message);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-sm sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Policy Details</DialogTitle>
          <DialogDescription>
            Make changes to your policy template. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} className="rounded-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Frequency).map((freq) => (
                        <SelectItem key={freq} value={freq} className="rounded-sm">
                          {freq.charAt(0).toUpperCase() +
                            freq.slice(1).toLowerCase().replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Departments).map((dept) => (
                        <SelectItem key={dept} value={dept} className="rounded-sm">
                          {dept.charAt(0).toUpperCase() +
                            dept.slice(1).toLowerCase().replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} className="rounded-sm">
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
