'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Departments, Frequency } from '@prisma/client'; // Assuming enums are available
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { toast } from 'sonner'; // Correct sonner import

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { createPolicyAction } from '../actions';
import { CreatePolicySchema, type CreatePolicySchemaType } from '../schemas';

// Define props for external control
interface CreatePolicyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePolicyDialog({ isOpen, onOpenChange }: CreatePolicyDialogProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CreatePolicySchemaType>({
    resolver: zodResolver(CreatePolicySchema),
    defaultValues: {
      name: '',
      description: '',
      // Provide default enum values if necessary, or handle undefined
      // frequency: Frequency.YEARLY, // Example default
      // department: Departments.ENGINEERING, // Example default
    },
  });

  const onSubmit = (values: CreatePolicySchemaType) => {
    startTransition(async () => {
      const result = await createPolicyAction(values);

      if (result.errors) {
        // Handle validation errors (e.g., display in form)
        console.error('Validation errors:', result.errors);
        toast.error('Validation failed', { description: result.message });
        // You might want to iterate through result.errors and set form errors
        // form.setError('name', { type: 'server', message: result.errors.name?.[0] }); // Example
      } else if (result.success && result.policyId) {
        toast.success('Policy created successfully!');
        onOpenChange(false); // Call the external state setter
        form.reset();
        router.push(`/policies/${result.policyId}`);
        router.refresh(); // Refresh data on the page
      } else {
        toast.error('Error creating policy', { description: result.message });
      }
    });
  };

  // Helper to get enum keys for select options
  const getEnumKeys = (enumObj: object) => Object.keys(enumObj);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Policy</DialogTitle>
          <DialogDescription>Fill in the details for the new policy template.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreatePolicySchemaType, 'name'>;
              }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Access Control Policy"
                      {...field}
                      className="rounded-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreatePolicySchemaType, 'description'>;
              }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe the policy..." {...field} className="rounded-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreatePolicySchemaType, 'frequency'>;
              }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getEnumKeys(Frequency).map((key) => (
                        <SelectItem key={key} value={key} className="rounded-sm">
                          {key}
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
              render={({
                field,
              }: {
                field: ControllerRenderProps<CreatePolicySchemaType, 'department'>;
              }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getEnumKeys(Departments).map((key) => (
                        <SelectItem key={key} value={key} className="rounded-sm">
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-sm">
                {isPending ? 'Creating...' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
