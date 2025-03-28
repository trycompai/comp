"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@bubba/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@bubba/ui/drawer";
import { useMediaQuery } from "@bubba/ui/hooks";
import { ScrollArea } from "@bubba/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@bubba/ui/sheet";
import { X } from "lucide-react";
import { useQueryState } from "nuqs";
import { CreateVendorTaskForm } from "./create-vendor-task-form";

export function CreateVendorTaskSheet() {
  const t = useI18n();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useQueryState("create-vendor-task-sheet");
  const isOpen = Boolean(open);

  const handleOpenChange = (open: boolean) => {
    setOpen(open ? "true" : null);
  };

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent stack>
          <SheetHeader className="mb-8 flex justify-between items-center flex-row">
            <SheetTitle>{t("vendors.tasks.sheet.title")}</SheetTitle>
            <Button
              size="icon"
              variant="ghost"
              className="p-0 m-0 size-auto hover:bg-transparent"
              onClick={() => setOpen(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>

          <ScrollArea className="h-full p-0 pb-[100px]" hideScrollbar>
            <CreateVendorTaskForm />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTitle hidden>{t("vendors.tasks.sheet.title")}</DrawerTitle>
      <DrawerContent className="p-6">
        <CreateVendorTaskForm />
      </DrawerContent>
    </Drawer>
  );
}
