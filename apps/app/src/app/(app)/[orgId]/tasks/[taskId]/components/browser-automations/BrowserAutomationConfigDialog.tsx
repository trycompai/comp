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
import { Textarea } from '@comp/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { BrowserAutomation } from '../../hooks/types';

const automationConfigSchema = z.object({
  name: z.string().trim().min(1, { message: 'Name is required' }),
  targetUrl: z.string().trim().url({ message: 'Starting URL must be a valid URL' }),
  instruction: z.string().trim().min(1, { message: 'Instruction is required' }),
});

type AutomationConfigFormData = z.infer<typeof automationConfigSchema>;

interface BrowserAutomationConfigDialogProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialValues?: Pick<BrowserAutomation, 'id' | 'name' | 'targetUrl' | 'instruction'>;
  isSaving: boolean;
  onClose: () => void;
  onCreate: (data: AutomationConfigFormData) => Promise<boolean>;
  onUpdate: (args: { automationId: string; input: AutomationConfigFormData }) => Promise<boolean>;
}

export function BrowserAutomationConfigDialog({
  isOpen,
  mode,
  initialValues,
  isSaving,
  onClose,
  onCreate,
  onUpdate,
}: BrowserAutomationConfigDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AutomationConfigFormData>({
    resolver: zodResolver(automationConfigSchema),
    defaultValues: {
      name: '',
      targetUrl: '',
      instruction: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialValues) {
      reset({
        name: initialValues.name ?? '',
        targetUrl: initialValues.targetUrl ?? '',
        instruction: initialValues.instruction ?? '',
      });
      return;
    }

    reset({ name: '', targetUrl: '', instruction: '' });
  }, [isOpen, mode, initialValues, reset]);

  const handleClose = () => {
    reset({ name: '', targetUrl: '', instruction: '' });
    onClose();
  };

  const handleSave = async (data: AutomationConfigFormData) => {
    const normalized = automationConfigSchema.parse(data);

    if (mode === 'edit') {
      if (!initialValues?.id) return false;
      const ok = await onUpdate({ automationId: initialValues.id, input: normalized });
      if (ok) handleClose();
      return ok;
    }

    const ok = await onCreate(normalized);
    if (ok) handleClose();
    return ok;
  };

  const title = mode === 'edit' ? 'Edit Browser Automation' : 'Create Browser Automation';
  const description =
    mode === 'edit'
      ? 'Update where the AI starts and what it should do before taking a screenshot.'
      : 'Configure an automation to navigate to a page and capture a screenshot.';
  const submitLabel = mode === 'edit' ? 'Save changes' : 'Create automation';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-name">Name</Label>
            <Input
              id="automation-name"
              placeholder="e.g., GitHub Branch Protection"
              {...register('name')}
            />
            {errors.name?.message && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-target-url">Starting URL</Label>
            <Input
              id="automation-target-url"
              placeholder="https://github.com/owner/repo"
              {...register('targetUrl')}
            />
            {errors.targetUrl?.message ? (
              <p className="text-sm text-destructive">{errors.targetUrl.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                The URL where the automation will start navigating from.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-instruction">Navigation Instruction</Label>
            <Textarea
              id="automation-instruction"
              placeholder="Navigate to Settings, then click on Branches to view branch protection rules"
              {...register('instruction')}
              rows={3}
            />
            {errors.instruction?.message ? (
              <p className="text-sm text-destructive">{errors.instruction.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Describe in natural language where the AI should navigate before taking a
                screenshot.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
