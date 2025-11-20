"use client";

import { UpdatePolicyForm } from "@/components/forms/policies/update-policy-form";
import { X } from "lucide-react";
import { useQueryState } from "nuqs";

import { Policy } from "@trycompai/db";
import { Button } from "@trycompai/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@trycompai/ui/drawer";
import { useMediaQuery } from "@trycompai/ui/hooks";
import { ScrollArea } from "@trycompai/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@trycompai/ui/sheet";

export function PolicyOverviewSheet({ policy }: { policy: Policy }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useQueryState("policy-overview-sheet");
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? "true" : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8">
            <div className="flex flex-row items-center justify-between">
              <SheetTitle>{"Update Policy"}</SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="m-0 size-auto p-0 hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>{" "}
            <SheetDescription>
              {"Update policy details, content and metadata."}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <UpdatePolicyForm policy={policy} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{"Update Policy"}</DrawerTitle>
      <DrawerContent className="p-6">
        <UpdatePolicyForm policy={policy} />
      </DrawerContent>
    </Drawer>
  );
}
