'use client';

import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { usePermissions } from '@/hooks/use-permissions';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useSecrets } from '../hooks/useSecrets';

const secretSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[A-Z0-9_]+$/, 'Name must be uppercase letters, numbers, and underscores only'),
  value: z.string().min(1, 'Value is required'),
  description: z.string().optional(),
  category: z.string().optional(),
});

type SecretFormValues = z.infer<typeof secretSchema>;

export function AddSecretDialog() {
  const [open, setOpen] = useState(false);
  const { createSecret } = useSecrets();
  const { hasPermission } = usePermissions();
  const canManageSecrets = hasPermission('organization', 'update');

  const {
    handleSubmit,
    control,
    register,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SecretFormValues>({
    resolver: zodResolver(secretSchema),
    defaultValues: { name: '', value: '', description: '', category: '' },
    mode: 'onChange',
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createSecret({
        name: values.name,
        value: values.value,
        description: values.description || null,
        category: values.category || null,
      });

      toast.success('Secret created successfully');
      setOpen(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create secret');
      console.error('Error creating secret:', err);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Secret
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Secret</DialogTitle>
            <DialogDescription>
              Create a new secret that can be accessed by AI automations in your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Secret Name</Label>
              <Input
                id="name"
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
              <Label htmlFor="value">Secret Value</Label>
              <Input
                id="value"
                type="password"
                placeholder="Enter the secret value"
                {...register('value')}
              />
              {errors.value?.message ? (
                <p className="text-xs text-destructive mt-1">{errors.value.message}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category">
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
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !canManageSecrets}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Secret'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
