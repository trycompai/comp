'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@comp/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@comp/ui/form';
import { Input } from '@comp/ui/input';
import { Stack, Text } from '@trycompai/design-system';
import { PermissionMatrix } from './PermissionMatrix';

/**
 * Schema for role form validation
 * - name: letters, numbers, spaces, and hyphens
 * - permissions: at least one permission must be granted
 */
const roleFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(
      /^[a-zA-Z][a-zA-Z0-9\s-]*$/,
      'Name must start with a letter and contain only letters, numbers, spaces, and hyphens'
    ),
  permissions: z
    .record(z.string(), z.array(z.string()))
    .check((ctx) => {
      const permissions = ctx.value;
      const hasPermissions = Object.values(permissions).some(
        (actions) => actions.length > 0
      );
      if (!hasPermissions) {
        ctx.issues.push({
          code: 'custom',
          message: 'At least one permission must be granted',
          path: [],
          input: permissions,
        });
      }
    }),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  defaultValues?: Partial<RoleFormValues>;
  onSubmit: (values: RoleFormValues) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function RoleForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save',
}: RoleFormProps) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      permissions: defaultValues?.permissions || {},
    },
  });

  const handleSubmit = async (values: RoleFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Stack gap="lg">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Compliance Lead"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  Must start with a letter. Can contain letters, numbers, spaces, and hyphens.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="permissions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Permissions</FormLabel>
                <FormDescription>
                  Select the access level for each resource. Read allows read-only access,
                  Write allows full management.
                </FormDescription>
                <FormControl>
                  <PermissionMatrix
                    value={field.value as Record<string, string[]>}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </Stack>
      </form>
    </Form>
  );
}

export { roleFormSchema };
