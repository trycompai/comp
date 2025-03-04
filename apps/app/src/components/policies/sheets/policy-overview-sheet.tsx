"use client";

import { UpdatePolicyForm } from "@/components/forms/policies/update-policy-form";
import { useI18n } from "@/locales/client";
import type { OrganizationPolicy, Policy } from "@bubba/db";
import { Button } from "@bubba/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@bubba/ui/drawer";
import { useMediaQuery } from "@bubba/ui/hooks";
import { ScrollArea } from "@bubba/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@bubba/ui/sheet";
import { X } from "lucide-react";
import { useQueryState } from "nuqs";

export function PolicyOverviewSheet({
  policy,
}: {
  policy: OrganizationPolicy & { policy: Policy };
}) {
  const t = useI18n();

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
            <div className="flex justify-between items-center flex-row">
              <SheetTitle>
                {t("policies.overview.form.update_policy")}
              </SheetTitle>
              <Button
                size="icon"
                variant="ghost"
                className="p-0 m-0 size-auto hover:bg-transparent"
                onClick={() => setOpen(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>{" "}
            <SheetDescription>
              {t("policies.overview.form.update_policy_description")}
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
      <DrawerTitle hidden>
        {t("policies.overview.form.update_policy")}
      </DrawerTitle>
      <DrawerContent className="p-6">
        <UpdatePolicyForm policy={policy} />
      </DrawerContent>
    </Drawer>
  );
}
