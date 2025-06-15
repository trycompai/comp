"use client";

import { Button } from "@comp/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@comp/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@comp/ui/form";
import { Input } from "@comp/ui/input";
import { Textarea } from "@comp/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FrameworkEditorRequirement } from "@prisma/client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { updateRequirementAction } from "../../actions/update-requirement-action";
import { RequirementBaseSchema } from "../../schemas";

interface EditRequirementDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  requirement: Pick<
    FrameworkEditorRequirement,
    "id" | "name" | "description" | "identifier"
  > & { frameworkId: string };
  onRequirementUpdated?: (
    updatedData: Pick<
      FrameworkEditorRequirement,
      "id" | "name" | "description" | "identifier"
    >,
  ) => void;
}

const requirementFormSchema = RequirementBaseSchema;

type RequirementFormValues = z.infer<typeof requirementFormSchema>;

export function EditRequirementDialog({
  isOpen,
  onOpenChange,
  requirement,
  onRequirementUpdated,
}: EditRequirementDialogProps) {
  const form = useForm<RequirementFormValues>({
    resolver: zodResolver(requirementFormSchema),
    defaultValues: {
      name: requirement.name,
      description: requirement.description ?? "",
      identifier: requirement.identifier ?? "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({
      name: requirement.name,
      description: requirement.description ?? "",
      identifier: requirement.identifier ?? "",
    });
  }, [requirement, form]);

  async function onSubmit(values: RequirementFormValues) {
    const formData = new FormData();
    formData.append("id", requirement.id);
    formData.append("frameworkId", requirement.frameworkId);
    formData.append("name", values.name);
    if (values.description) {
      formData.append("description", values.description);
    }
    if (values.identifier) {
      formData.append("identifier", values.identifier);
    }

    const result = await updateRequirementAction(null, formData);

    if (result.success && result.data) {
      toast.success("Requirement updated successfully!");
      onOpenChange(false);
      if (onRequirementUpdated) {
        onRequirementUpdated(result.data);
      }
    } else if (result.error) {
      if (result.issues) {
        result.issues.forEach((issue: z.ZodIssue) => {
          if (
            issue.path &&
            issue.path.length > 0 &&
            (issue.path[0] === "name" || issue.path[0] === "description")
          ) {
            form.setError(issue.path[0] as keyof RequirementFormValues, {
              type: "server",
              message: issue.message,
            });
          } else {
            toast.error(issue.message);
          }
        });
      } else {
        toast.error(result.error);
      }
    } else {
      toast.error("An unexpected error occurred.");
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset({
            name: requirement.name,
            description: requirement.description ?? "",
            identifier: requirement.identifier ?? "",
          });
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Requirement</DialogTitle>
          <DialogDescription>
            Update the details for the requirement. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Name</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="Enter requirement name" {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Identifier</FormLabel>
                  <FormControl className="col-span-3">
                    <Input placeholder="e.g., cc1-1" {...field} />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="grid grid-cols-4 items-center gap-2">
                  <FormLabel className="text-right">Description</FormLabel>
                  <FormControl className="col-span-3">
                    <Textarea
                      placeholder="Enter requirement description (optional)"
                      {...field}
                      rows={8}
                    />
                  </FormControl>
                  <div className="col-span-3 col-start-2">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting || !form.formState.isDirty
                }
              >
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
