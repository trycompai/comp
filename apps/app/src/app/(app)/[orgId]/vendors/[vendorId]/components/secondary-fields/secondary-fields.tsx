"use client";

import type { Member, User, Vendor } from "@comp/db/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@comp/ui/card";
import { UpdateSecondaryFieldsForm } from "./update-secondary-fields-form";
import { UpdateTitleAndDescriptionSheet } from "../title-and-description/update-title-and-description-sheet";
import { Button } from "@comp/ui/button";
import { useQueryState } from "nuqs";
import { PencilIcon } from "lucide-react";

export function SecondaryFields({
  vendor,
  assignees,
}: {
  vendor: Vendor & { assignee: { user: User | null } | null };
  assignees: (Member & { user: User })[];
}) {
  const [_, setOpen] = useQueryState("vendor-overview-sheet");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardTitle>{vendor.name}</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen("true")}
              >
                <PencilIcon className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription>{vendor.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <UpdateSecondaryFieldsForm vendor={vendor} assignees={assignees} />
        </CardContent>
      </Card>
      <UpdateTitleAndDescriptionSheet vendor={vendor} />
    </div>
  );
}
