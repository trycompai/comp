"use client";

import { useMediaQuery } from "@comp/ui/hooks";
import { Sheet, SheetContent } from "@comp/ui/sheet";

import { useQueryState } from "nuqs";
import Chat from "../ai/chat";
import "@comp/ui/editor.css";
import { Drawer, DrawerContent, DrawerTitle } from "@comp/ui/drawer";

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
