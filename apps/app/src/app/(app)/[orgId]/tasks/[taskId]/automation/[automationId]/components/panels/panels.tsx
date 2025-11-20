import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  children: ReactNode;
}

export function Panel({ className, children }: Props) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        // Ensure consistent width regardless of content and prevent layout shift
        "min-w-0",
        // Subtle card background
        "bg-card",
        // Full border for clear separation
        "border-border border",
        // Light shadow for elevation
        "shadow-sm",
        // Slight rounding
        "rounded-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ className, children }: Props) {
  return (
    <div
      className={cn("relative flex h-12 shrink-0 items-center px-4", className)}
    >
      {children}
    </div>
  );
}
