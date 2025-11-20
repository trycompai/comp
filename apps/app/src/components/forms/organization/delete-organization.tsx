"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { deleteOrganizationAction } from "@/actions/organization/delete-organization-action";
import { Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@trycompai/ui/alert-dialog";
import { Button } from "@trycompai/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@trycompai/ui/card";
import { Input } from "@trycompai/ui/input";
import { Label } from "@trycompai/ui/label";

export function DeleteOrganization({
  organizationId,
}: {
  organizationId: string;
}) {
  const [value, setValue] = useState("");
  const deleteOrganization = useAction(deleteOrganizationAction, {
    onSuccess: () => {
      toast.success("Organization deleted");
      redirect("/");
    },
    onError: () => {
      toast.error("Error deleting organization");
    },
  });

  return (
    <Card className="border-destructive border border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{"Delete organization"}</CardTitle>
        </div>
        <CardDescription>
          <div className="max-w-[600px]">
            {
              "Permanently remove your organization and all of its contents from the Comp AI platform. This action is not reversible - please continue with caution."
            }
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent />
      <CardFooter className="flex justify-between">
        <div />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="hover:bg-destructive/90"
            >
              {"Delete"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{"Are you absolutely sure?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {
                  "This action cannot be undone. This will permanently delete your organization and remove your data from our servers."
                }
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-2 flex flex-col gap-2">
              <Label htmlFor="confirm-delete">
                {"Type 'delete' to confirm"}
              </Label>
              <Input
                id="confirm-delete"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteOrganization.execute({
                    id: organizationId,
                    organizationId,
                  })
                }
                disabled={value !== "delete"}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteOrganization.status === "executing" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                {"Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
