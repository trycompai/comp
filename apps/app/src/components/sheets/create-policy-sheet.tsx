"use client";

import { X } from "lucide-react";
import { useQueryState } from "nuqs";

import { Button } from "@trycompai/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@trycompai/ui/drawer";
import { useMediaQuery } from "@trycompai/ui/hooks";
import { ScrollArea } from "@trycompai/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@trycompai/ui/sheet";

import { CreateNewPolicyForm } from "../forms/policies/create-new-policy";

export function CreatePolicySheet() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useQueryState("create-policy-sheet");
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? "true" : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8 flex flex-row items-center justify-between">
            <SheetTitle>{"Create New Policy"}</SheetTitle>
            <Button
              size="icon"
              variant="ghost"
              className="m-0 size-auto p-0 hover:bg-transparent"
              onClick={() => setOpen(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <CreateNewPolicyForm />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{"Create New Policy"}</DrawerTitle>
      <DrawerContent className="p-6">
        <CreateNewPolicyForm />
      </DrawerContent>
    </Drawer>
  );
}
