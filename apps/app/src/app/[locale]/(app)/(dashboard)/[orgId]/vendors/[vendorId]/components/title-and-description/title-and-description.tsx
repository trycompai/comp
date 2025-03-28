"use client";

import { useI18n } from "@/locales/client";
import type { User, Vendor } from "@bubba/db/types";
import { Alert, AlertDescription, AlertTitle } from "@bubba/ui/alert";
import { Button } from "@bubba/ui/button";
import { Icons } from "@bubba/ui/icons";
import { PencilIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { UpdateTitleAndDescriptionSheet } from "./update-title-and-description-sheet";

export function TitleAndDescription({
  vendor,
}: {
  vendor: Vendor & { owner: User | null };
}) {
  const t = useI18n();
  const [_, setOpen] = useQueryState("vendor-overview-sheet");

  return (
    <div className="space-y-4">
      <Alert>
        <Icons.Risk className="h-4 w-4" />
        <AlertTitle>
          <div className="flex items-center justify-between gap-2">
            {vendor.name}
            <Button
              size="icon"
              variant="ghost"
              className="p-0 m-0 size-auto"
              onClick={() => setOpen("true")}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          </div>
        </AlertTitle>
        <AlertDescription className="mt-4">{vendor.description}</AlertDescription>
      </Alert>
      <UpdateTitleAndDescriptionSheet vendor={vendor} />
    </div>
  );
}
