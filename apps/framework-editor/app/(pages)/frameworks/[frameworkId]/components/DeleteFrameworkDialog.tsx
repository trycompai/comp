"use client";

import { useState, useTransition } from "react";
// useRouter is not strictly needed if action handles redirect and client only refreshes or closes dialog.
// import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@comp/ui/alert-dialog";
import { Button } from "@comp/ui/button";
import { useToast } from "@comp/ui/use-toast";
import { deleteFrameworkAction } from "../actions/delete-framework";
import type { DeleteFrameworkActionState } from "../actions/delete-framework";

interface DeleteFrameworkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  frameworkId: string;
  frameworkName: string;
  // onFrameworkDeleted: () => void; // This can be removed if redirect handles everything
}

export function DeleteFrameworkDialog({
  isOpen,
  onOpenChange,
  frameworkId,
  frameworkName,
}: DeleteFrameworkDialogProps) {
  // const router = useRouter(); // Not needed if action handles redirect
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  // Local state to hold any error messages from the action
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = async () => {
    setError(undefined); // Clear previous errors
    const formData = new FormData();
    formData.append("frameworkId", frameworkId);

    startTransition(async () => {
      // The first argument to the action is `prevState`, which we don't have in this direct invocation model.
      // We pass `null` or an initial state if the action was designed for `useFormState`.
      // Since our action primarily uses `formData` and redirects, the `prevState` isn't critical for its flow here.
      const result: DeleteFrameworkActionState = await deleteFrameworkAction(
        null,
        formData,
      );

      if (result && !result.success) {
        setError(result.error || "Failed to delete framework.");
        toast({
          title: "Error",
          description:
            result.error ||
            (result.issues
              ? result.issues.map((i) => i.message).join(", ")
              : "An unexpected error occurred."),
          variant: "destructive",
        });
      } else if (result && result.success) {
        // If success is true, a redirect should have been initiated by the server action.
        // We might still want to show a toast here, but it might be cleared by the redirect.
        toast({
          title: "Success",
          description:
            result.message || "Framework is being deleted. Redirecting...",
        });
        onOpenChange(false); // Close the dialog
        // No explicit client-side redirect needed as the server action handles it.
      }
      // If `result` is null/undefined (should not happen with current action), it means an unhandled case or network error before action completion.
    });
  };

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isPending && !open) return; // Prevent closing while action is pending if onOpenChange is triggered externally
        if (!open) setError(undefined); // Clear errors when dialog is explicitly closed
        onOpenChange(open);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete {`"${frameworkName}"`}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            framework and all of its associated requirements.
            {error && (
              <p className="text-destructive mt-2 text-sm font-medium">
                Error: {error}
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </AlertDialogCancel>
          {/* AlertDialogAction can be used for the primary action button styling */}
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
