"use client";

import { Sheet, SheetContent } from "@bubba/ui/sheet";
import { useMediaQuery } from "@bubba/ui/hooks";

import { useQueryState } from "nuqs";
import Chat from "../ai/chat";
import "@bubba/ui/editor.css";
import { Drawer, DrawerContent, DrawerTitle } from "@bubba/ui/drawer";

export function AssistantSheet() {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [isOpen, setIsOpen] = useQueryState("assistant", {
    history: "push",
    parse: (value) => value === "true",
    serialize: (value) => value.toString(),
  });

  if (isDesktop) {
    return (
      <Sheet open={isOpen ?? false} onOpenChange={setIsOpen}>
        <SheetContent>
          <Chat />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen ?? false} onOpenChange={setIsOpen}>
      <DrawerTitle hidden>Assistant</DrawerTitle>
      <DrawerContent className="p-6">
        <Chat />
      </DrawerContent>
    </Drawer>
  );
}