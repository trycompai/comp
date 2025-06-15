"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type FrameworkEditorPolicyTemplate,
  Frequency,
  Departments,
} from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@comp/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@comp/ui/select";
import { updatePolicyTemplateDetails } from "../../actions"; // Path to server actions

// Schema for the form, consistent with server action
const EditPolicySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullish(),
  frequency: z.nativeEnum(Frequency),
  department: z.nativeEnum(Departments),
});

type EditPolicyFormValues = z.infer<typeof EditPolicySchema>;

interface EditPolicyDialogProps {
  policy: FrameworkEditorPolicyTemplate;
  isOpen: boolean;
  onClose: () => void;
  onPolicyUpdated: () => void; // Callback after successful update
}

export function EditPolicyDialog({
  policy,
  isOpen,
  onClose,
  onPolicyUpdated,
}: EditPolicyDialogProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<EditPolicyFormValues>({
    resolver: zodResolver(EditPolicySchema),
    defaultValues: {
      name: policy.name || "",
      description: policy.description || "",
      frequency: policy.frequency || Frequency.yearly, // Default if null
      department: policy.department || Departments.none, // Default if null
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: policy.name || "",
        description: policy.description || "",
        frequency: policy.frequency || Frequency.yearly,
        department: policy.department || Departments.none,
      });
    }
  }, [isOpen, policy, form]);

  const onSubmit = (values: EditPolicyFormValues) => {
    startTransition(async () => {
      try {
        const result = await updatePolicyTemplateDetails(policy.id, values);
        if (result.success) {
          toast.success(result.message || "Policy updated successfully!");
          onPolicyUpdated(); // Refresh data on the page
          onClose(); // Close the dialog
        } else {
          toast.error(result.message || "Failed to update policy.");
        }
      } catch (error) {
        toast.error("An unexpected error occurred.");
        console.error("Update error:", error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-sm sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Policy Details</DialogTitle>
          <DialogDescription>
            Make changes to your policy template. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      className="rounded-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Frequency).map((freq) => (
                        <SelectItem
                          key={freq}
                          value={freq}
                          className="rounded-sm"
                        >
                          {freq.charAt(0).toUpperCase() +
                            freq.slice(1).toLowerCase().replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Departments).map((dept) => (
                        <SelectItem
                          key={dept}
                          value={dept}
                          className="rounded-sm"
                        >
                          {dept.charAt(0).toUpperCase() +
                            dept.slice(1).toLowerCase().replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-sm">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending} className="rounded-sm">
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
