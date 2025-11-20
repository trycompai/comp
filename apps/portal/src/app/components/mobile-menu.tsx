"use client";

import { useState } from "react";

import { Button } from "@trycompai/ui/button";
import { Icons } from "@trycompai/ui/icons";
import { Sheet, SheetContent } from "@trycompai/ui/sheet";

import { MainMenu } from "./main-menu";

export function MobileMenu() {
  const [isOpen, setOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          className="relative flex h-8 w-8 items-center rounded-full md:hidden"
        >
          <Icons.Menu size={16} />
        </Button>
      </div>
      <SheetContent side="left" className="-ml-2 rounded-sm border-none">
        <div className="mb-8 ml-2">
          <Icons.Logo />
        </div>

        <MainMenu onSelect={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
