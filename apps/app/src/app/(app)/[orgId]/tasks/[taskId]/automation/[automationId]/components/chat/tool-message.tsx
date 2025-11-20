import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ToolMessage(props: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto px-4 py-3.5 font-mono text-xs break-words",
        "bg-muted",
        "border-border border",
        "rounded-sm",
        "shadow-sm",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
