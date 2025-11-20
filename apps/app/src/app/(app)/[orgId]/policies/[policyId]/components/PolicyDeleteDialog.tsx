"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePolicyAction } from "@/actions/policies/delete-policy";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Policy } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@trycompai/ui/dialog";
import { Form } from "@trycompai/ui/form";

const formSchema = z.object({
  comment: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PolicyDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy;
}

export function PolicyDeleteDialog({
  isOpen,
  onClose,
  policy,
}: PolicyDeleteDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  });

  const deletePolicy = useAction(deletePolicyAction, {
    onSuccess: () => {
      onClose();
    },
    onError: () => {
      toast.error("Failed to delete policy.");
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    deletePolicy.execute({
      id: policy.id,
      entityId: policy.id,
    });

    setTimeout(() => {
      router.replace(`/${policy.organizationId}/policies/all`);
    }, 1000);
    toast.info("Policy deleted! Redirecting to policies list...");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Policy</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this policy? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
