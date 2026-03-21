'use client';

import { apiClient } from '@/app/lib/api-client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@trycompai/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface DeleteFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  frameworkId: string;
  frameworkName: string;
}

export function DeleteFrameworkDialog({
  isOpen,
  onOpenChange,
  frameworkId,
  frameworkName,
}: DeleteFrameworkDialogProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleDelete = async () => {
    setError(undefined);
    setIsPending(true);
    try {
      await apiClient(`/framework/${frameworkId}`, { method: 'DELETE' });
      toast.success('Framework deleted successfully.');
      onOpenChange(false);
      router.push('/frameworks');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete framework.';
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isPending && !open) return;
        if (!open) setError(undefined);
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete {`"${frameworkName}"`}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the framework and all of its
            associated requirements.
            {error && <p className="text-destructive mt-2 text-sm font-medium">Error: {error}</p>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
