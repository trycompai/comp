'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

interface EditSecretDialogProps {
  secret: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSecretUpdated?: () => void;
}

const editSecretSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase letters, numbers, and underscores only'),
  value: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

type EditSecretFormValues = z.infer<typeof editSecretSchema>;

export function EditSecretDialog({
  secret,
  open,
  onOpenChange,
  onSecretUpdated,
}: EditSecretDialogProps) {
  const {
    handleSubmit,
    control,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditSecretFormValues>({
    resolver: zodResolver(editSecretSchema),
    defaultValues: {
      name: secret.name,
      value: '',
      description: secret.description || '',
      category: secret.category || '',
    },
    mode: 'onChange',
  });

  // Reset form when secret changes
  useEffect(() => {
    reset({
      name: secret.name,
      value: '',
      description: secret.description || '',
      category: secret.category || '',
    });
  }, [secret, reset]);

  const onSubmit = handleSubmit(async (values) => {
    // Get organizationId from the URL path
    const pathSegments = window.location.pathname.split('/');
    const orgId = pathSegments[1];

    try {
      // Only send fields that have values
      const updateData: Record<string, string | null> = {
        organizationId: orgId,
      };
      if (values.name !== secret.name) updateData.name = values.name;
      if (values.value) updateData.value = values.value;
      if (values.description !== secret.description)
        updateData.description = values.description || null;
      if (values.category !== secret.category) updateData.category = values.category || null;

      const response = await fetch(`/api/secrets/${secret.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        // Map Zod errors to form fields
        if (Array.isArray(error.details)) {
          let handled = false;
          for (const issue of error.details) {
            const field = issue?.path?.[0] as keyof EditSecretFormValues | undefined;
            if (field) {
              setError(field, { type: 'server', message: issue.message });
              handled = true;
            }
          }
          if (handled) return;
        }
        throw new Error(error.error || 'Failed to update secret');
      }

      toast.success('Secret updated successfully');
      onOpenChange(false);
      reset();

      if (onSecretUpdated) onSecretUpdated();
      else window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update secret');
      console.error('Error updating secret:', err);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Secret</DialogTitle>
            <DialogDescription>
              Update the secret details. Leave value empty to keep the existing value.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Secret Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., GITHUB_TOKEN, OPENAI_API_KEY"
                {...register('name')}
              />
              {errors.name?.message ? (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Use uppercase with underscores for naming convention
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-value">Secret Value (Optional)</Label>
              <Input
                id="edit-value"
                type="password"
                placeholder="Leave empty to keep existing value"
                {...register('value')}
              />
              {errors.value?.message ? (
                <p className="text-xs text-destructive mt-1">{errors.value.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Only provide a value if you want to update it
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category (Optional)</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_keys">API Keys</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category?.message ? (
                <p className="text-xs text-destructive mt-1">{errors.category.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what this secret is used for"
                rows={3}
                {...register('description')}
              />
              {errors.description?.message ? (
                <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Secret'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
