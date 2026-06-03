'use client';

import {
  useAdminFindingTemplates,
  type FindingTemplate,
} from '@/hooks/use-admin-finding-templates';
import { api } from '@/lib/api-client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@trycompai/design-system';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteTemplateDialogProps {
  template: FindingTemplate | null;
  onClose: () => void;
}

export function DeleteTemplateDialog({ template, onClose }: DeleteTemplateDialogProps) {
  const { mutate } = useAdminFindingTemplates();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!template) return;
    setDeleting(true);
    const res = await api.delete(`/v1/finding-template/${template.id}`);
    setDeleting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success('Template deleted');
    mutate();
    onClose();
  };

  return (
    <AlertDialog open={Boolean(template)} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{template?.title}&rdquo;? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" loading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
