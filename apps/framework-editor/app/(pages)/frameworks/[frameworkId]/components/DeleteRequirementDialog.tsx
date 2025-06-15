"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@comp/ui/alert-dialog";
import { Button } from "@comp/ui/button";
import { useToast } from "@comp/ui/use-toast";
import {
  deleteRequirementAction,
  type DeleteRequirementActionState,
} from "../actions/delete-requirement-action";

const initialActionState: DeleteRequirementActionState = {
  success: false,
  error: undefined,
  issues: undefined,
};

interface DeleteRequirementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  requirementId: string;
  requirementName: string;
  frameworkId: string;
  onRequirementDeleted: () => void;
}

export function DeleteRequirementDialog({
  isOpen,
  onOpenChange,
  requirementId,
  requirementName,
  frameworkId,
  onRequirementDeleted,
}: DeleteRequirementDialogProps) {
  const { toast } = useToast();
  // Use React.useActionState if available and preferred, for now using useTransition and local state
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | undefined>(undefined);

  const handleSubmit = async () => {
    setActionError(undefined);
    const formData = new FormData();
    formData.append("requirementId", requirementId);
    formData.append("frameworkId", frameworkId);

    startTransition(async () => {
      const result = await deleteRequirementAction(
        initialActionState,
        formData,
      ); // Pass initial state

      if (result && !result.success) {
        const errorMessage =
          result.error ||
          (result.issues
            ? result.issues.map((i) => i.message).join(", ")
            : "Failed to delete requirement.");
        setActionError(errorMessage);
        toast({
          title: "Error Deleting Requirement",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (result && result.success) {
        toast({
          title: "Success",
          description: `Requirement "${requirementName}" has been deleted.`,
        });
        onRequirementDeleted();
      }
    });
  };

  const handleDialogClose = (openState: boolean) => {
    if (isPending && !openState) return;
    if (!openState) setActionError(undefined);
    onOpenChange(openState);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleDialogClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Requirement?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the requirement:{" "}
            <strong>{requirementName}</strong>? This action cannot be undone.
            {actionError && (
              <p className="text-destructive mt-2 text-sm font-medium">
                Error: {actionError}
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            onClick={() => handleDialogClose(false)}
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete Requirement"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
