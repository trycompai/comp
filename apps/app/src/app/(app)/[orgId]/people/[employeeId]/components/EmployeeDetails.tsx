"use client";

import type { Departments, Member, User } from "@comp/db/types";
import { Button } from "@comp/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@comp/ui/card";
import { Form } from "@comp/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Department } from "./Fields/Department";
import { Email } from "./Fields/Email";
import { JoinDate } from "./Fields/JoinDate";
import { Name } from "./Fields/Name";
import { Status } from "./Fields/Status";
import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import { updateEmployee } from "../actions/update-employee";

// Define form schema with Zod
const employeeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  department: z.enum([
    "admin",
    "gov",
    "hr",
    "it",
    "itsm",
    "qms",
    "none",
  ] as const),
  status: z.enum(["active", "inactive"] as const),
  createdAt: z.date(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const EmployeeDetails = ({
  employee,
}: {
  employee: Member & {
    user: User;
  };
}) => {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee.user.name ?? "",
      email: employee.user.email ?? "",
      department: employee.department as Departments,
      status: employee.isActive ? "active" : "inactive",
      createdAt: new Date(employee.createdAt),
    },
    mode: "onChange",
  });

  const { execute, status: actionStatus } = useAction(updateEmployee, {
    onSuccess: () => {
      toast.success("Employee details updated successfully");
    },
    onError: (error) => {
      toast.error(
        error?.error?.serverError || "Failed to update employee details",
      );
    },
  });

  const onSubmit = async (values: EmployeeFormValues) => {
    // Prepare update data
    const updateData: {
      employeeId: string;
      name?: string;
      email?: string;
      department?: string;
      isActive?: boolean;
      createdAt?: Date;
    } = { employeeId: employee.id };

    // Only include changed fields
    if (values.name !== employee.user.name) {
      updateData.name = values.name;
    }
    if (values.email !== employee.user.email) {
      updateData.email = values.email;
    }
    if (values.department !== employee.department) {
      updateData.department = values.department;
    }
    if (
      values.createdAt &&
      values.createdAt.toISOString() !== employee.createdAt.toISOString()
    ) {
      updateData.createdAt = values.createdAt;
    }

    const isActive = values.status === "active";
    if (isActive !== employee.isActive) {
      updateData.isActive = isActive;
    }

    // Execute the update only if there are changes
    if (Object.keys(updateData).length > 1) {
      await execute(updateData);
    } else {
      // No changes were made
      toast.info("No changes to save");
    }
  };

  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0 pb-6">
        <CardTitle className="text-2xl font-semibold">
          Employee Details
        </CardTitle>
        <p className="text-muted-foreground">
          Manage employee information and department assignment
        </p>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="px-0">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Name control={form.control} />
              <Email control={form.control} />
              <Department control={form.control} />
              <Status control={form.control} />
              <JoinDate control={form.control} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-none bg-transparent px-0 py-0 outline-hidden">
            <Button
              type="submit"
              disabled={
                !form.formState.isDirty ||
                form.formState.isSubmitting ||
                actionStatus === "executing"
              }
            >
              {!(
                form.formState.isSubmitting || actionStatus === "executing"
              ) && <Save className="h-4 w-4" />}
              {form.formState.isSubmitting || actionStatus === "executing"
                ? "Saving..."
                : "Save"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};
